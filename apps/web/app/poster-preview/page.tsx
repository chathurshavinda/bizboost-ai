"use client";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
import { DEFAULT_POSTER_DESIGN, PosterDesign, PosterTemplate, } from "@/src/components/poster/PosterTemplate";
type Draft = {
    _id?: string;
    caption?: string;
    hashtags?: string[];
    imageDataUrl?: string;
    imageName?: string;
    offerText?: string;
    dayNumber?: number | null;
    posterStyle?: PosterDesign["style"] | null;
    posterDesign?: PosterDesign | null;
};
async function waitForFontsAndPaint(): Promise<void> {
    if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready.catch(() => undefined);
    }
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
}
async function waitForImages(root: HTMLElement): Promise<void> {
    const images = [...root.querySelectorAll("img")];
    await Promise.all(images.map((img) => new Promise<void>((resolve) => {
        if (img.complete && img.naturalHeight > 0) {
            resolve();
            return;
        }
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, 12000);
    })));
}
function dataUrlToBlob(dataUrl: string): Blob {
    const comma = dataUrl.indexOf(",");
    const header = comma >= 0 ? dataUrl.slice(0, comma) : dataUrl;
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : "";
    const mime = /data:([^;]+)/.exec(header)?.[1] ?? "image/png";
    const binary = typeof atob === "function" ? atob(base64) : "";
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1)
        bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

/** Instagram-style square export — only the poster graphic, no card/page chrome. */
const POSTER_EXPORT_PX = 1080;

function resolvePosterWrapElement(container: HTMLElement | null): HTMLElement | null {
    if (!container)
        return null;
    if (container.classList.contains("posterWrap"))
        return container;
    const inner = container.querySelector(".posterWrap");
    return inner instanceof HTMLElement ? inner : null;
}

async function posterWrapToPngDataUrl(posterWrap: HTMLElement): Promise<string> {
    await waitForImages(posterWrap);
    await waitForFontsAndPaint();

    const w = Math.max(1, Math.round(posterWrap.offsetWidth || posterWrap.getBoundingClientRect().width));
    const h = Math.max(1, Math.round(posterWrap.offsetHeight || posterWrap.getBoundingClientRect().height));
    if (w !== h) {
        console.warn("[poster-preview] Export posterWrap is not square; output may be letterboxed. Size:", w, h);
    }

    const boxShadow = posterWrap.style.boxShadow,
        borderRadius = posterWrap.style.borderRadius,
        outline = posterWrap.style.outline,
        filter = posterWrap.style.filter;
    posterWrap.style.boxShadow = "none";
    posterWrap.style.borderRadius = "0";
    posterWrap.style.outline = "none";
    posterWrap.style.filter = "none";

    const toPngOpts = {
        cacheBust: true,
        pixelRatio: 1,
        width: POSTER_EXPORT_PX,
        height: POSTER_EXPORT_PX,
        /** No matte — art is edge-to-edge on the square. */
        backgroundColor: "rgba(0,0,0,0)",
        skipFonts: true,
    };

    try {
        return await toPng(posterWrap, toPngOpts);
    }
    catch {
        const { default: html2canvas } = await import("html2canvas");
        const side = Math.min(w, h);
        const scale = POSTER_EXPORT_PX / side;
        const canvas = await html2canvas(posterWrap, {
            backgroundColor: null,
            scale,
            width: w,
            height: h,
            windowWidth: w,
            windowHeight: h,
            x: 0,
            y: 0,
            useCORS: true,
            allowTaint: false,
            logging: false,
        });
        const out = document.createElement("canvas");
        out.width = POSTER_EXPORT_PX;
        out.height = POSTER_EXPORT_PX;
        const ctx = out.getContext("2d");
        if (!ctx)
            throw new Error("2d context unavailable");
        ctx.drawImage(canvas, 0, 0, POSTER_EXPORT_PX, POSTER_EXPORT_PX);
        return out.toDataURL("image/png");
    }
    finally {
        posterWrap.style.boxShadow = boxShadow;
        posterWrap.style.borderRadius = borderRadius;
        posterWrap.style.outline = outline;
        posterWrap.style.filter = filter;
    }
}

async function posterWrapFromExportMountOrPreview(posterCanvasEl: HTMLElement | null): Promise<string | null> {
    const mount = typeof document !== "undefined" ? document.getElementById("poster-export-mount") : null;
    const mountWrap = mount ? resolvePosterWrapElement(mount) : null;
    if (mountWrap)
        return posterWrapToPngDataUrl(mountWrap);
    if (!posterCanvasEl)
        return null;
    const wrap = resolvePosterWrapElement(posterCanvasEl);
    if (!wrap)
        return null;
    return posterWrapToPngDataUrl(wrap);
}
function triggerAnchorDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const isIOS = typeof navigator !== "undefined" &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1));
    if (isIOS) {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 120000);
        return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
    }, 2500);
}
export default function PosterPreviewPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const [draft, setDraft] = useState<Draft | null>(null);
    const [loading, setLoading] = useState(true);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [downloadBusy, setDownloadBusy] = useState(false);
    const [shareBusy, setShareBusy] = useState(false);
    const [shareUnsupportedOpen, setShareUnsupportedOpen] = useState(false);
    const [shareImageUrl, setShareImageUrl] = useState("");
    const [exportMessage, setExportMessage] = useState("");
    const [captionCopied, setCaptionCopied] = useState(false);
    const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
    const posterRef = useRef<HTMLDivElement>(null);
    const hasPoster = Boolean(draft?.imageDataUrl);
    const actionsLocked = loading;
    const exportBusy = confirmBusy || downloadBusy || shareBusy;
    const draftIdForFilename = useMemo(() => {
        const fromDraft = draft?._id?.trim();
        const fromQuery = searchParams.get("draftId")?.trim();
        return fromDraft || fromQuery || "unknown";
    }, [draft?._id, searchParams]);
    const fallbackShareLinks = useMemo(() => {
        const pageUrl = typeof window !== "undefined" ? window.location.href : "";
        const url = encodeURIComponent(pageUrl);
        const caption = (draft?.caption || "Check out my BizBoost poster").trim();
        const text = encodeURIComponent(caption);
        const combo = encodeURIComponent(`${caption} ${pageUrl}`.trim());
        return {
            whatsapp: `https://wa.me/?text=${combo}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
            telegram: `https://t.me/share/url?url=${url}&text=${text}`,
        };
    }, [draft?.caption, shareUnsupportedOpen]);
    useEffect(() => {
        if (authLoading)
            return;
        if (!user?.uid) {
            router.replace("/login");
            return;
        }
        const load = async () => {
            setLoading(true);
            const draftId = searchParams.get("draftId");
            const query = draftId ? `&draftId=${encodeURIComponent(draftId)}` : "";
            const response = await fetch(`/api/caption-drafts?firebase_uid=${encodeURIComponent(user.uid)}${query}`, {
                cache: "no-store",
            });
            const result = await response.json();
            if (response.ok && result?.ok) {
                const data = result.data as Record<string, unknown>;
                const id = typeof data._id === "string"
                    ? data._id
                    : data._id && typeof (data._id as {
                        toString?: () => string;
                    }).toString === "function"
                        ? (data._id as {
                            toString: () => string;
                        }).toString()
                        : undefined;
                setDraft({
                    ...data,
                    _id: id,
                    hashtags: Array.isArray(result?.data?.hashtags) ? result.data.hashtags : [],
                    offerText: typeof data.offerText === "string" ? data.offerText : "",
                    dayNumber: typeof data.dayNumber === "number" ? data.dayNumber : data.dayNumber === null ? null : Number(data.dayNumber) || null,
                } as Draft);
            }
            else {
                setDraft(null);
            }
            setIsConfirmed(false);
            setPosterDataUrl(null);
            setExportMessage("");
            setLoading(false);
        };
        void load();
    }, [authLoading, user?.uid, router, searchParams]);
    const buildPosterDataUrl = useCallback(async (): Promise<string | null> => {
        let canvasEl = posterRef.current ?? (document.getElementById("poster-canvas") as HTMLElement | null);
        if (!canvasEl) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            canvasEl = posterRef.current ?? (document.getElementById("poster-canvas") as HTMLElement | null);
        }
        return posterWrapFromExportMountOrPreview(canvasEl);
    }, []);
    useEffect(() => {
        if (!hasPoster || loading)
            return;
        let cancelled = false;
        const exportCurrentPreview = async () => {
            try {
                const next = await buildPosterDataUrl();
                if (cancelled)
                    return;
                if (next) {
                    setPosterDataUrl(next);
                    setExportMessage("");
                    console.log("posterDataUrl length", next.length);
                }
                else {
                    setPosterDataUrl(null);
                    setExportMessage("Poster export is not ready yet.");
                }
            }
            catch {
                if (cancelled)
                    return;
                setPosterDataUrl(null);
                setExportMessage("Poster export failed. Try refreshing the page.");
            }
        };
        void exportCurrentPreview();
        return () => {
            cancelled = true;
        };
    }, [buildPosterDataUrl, hasPoster, loading, draft?._id, draft?.caption, draft?.imageDataUrl]);
    const confirmPoster = useCallback(async () => {
        console.log("confirm clicked");
        if (exportBusy || !hasPoster)
            return;
        setConfirmBusy(true);
        try {
            const dataUrl = await buildPosterDataUrl();
            if (!dataUrl)
                return;
            setPosterDataUrl(dataUrl);
            console.log("posterDataUrl length", dataUrl?.length);
            setIsConfirmed(true);
            setExportMessage("");
        }
        catch (error) {
            console.error("[Poster Preview] Confirm poster failed:", error);
            const message = error instanceof Error ? error.message : "unknown_export_error";
            setExportMessage(`Could not confirm poster. Try again. (${message})`);
        }
        finally {
            setConfirmBusy(false);
        }
    }, [buildPosterDataUrl, exportBusy, hasPoster]);
    const handleDownload = useCallback(async () => {
        console.log("download clicked");
        if (exportBusy || !hasPoster || !isConfirmed)
            return;
        setDownloadBusy(true);
        try {
            const dataUrl = await buildPosterDataUrl();
            if (!dataUrl) {
                setExportMessage("Download failed: poster export unavailable.");
                return;
            }
            setPosterDataUrl(dataUrl);
            console.log("posterDataUrl length", dataUrl?.length);
            const blob = dataUrlToBlob(dataUrl);
            triggerAnchorDownload(blob, `bizboost-poster-${draftIdForFilename}.png`);
        }
        catch (error) {
            console.error("[Poster Preview] Download failed:", error);
            setExportMessage("Download failed. Try again.");
        }
        finally {
            setDownloadBusy(false);
        }
    }, [buildPosterDataUrl, draftIdForFilename, exportBusy, hasPoster, isConfirmed]);
    const handleShare = useCallback(async () => {
        console.log("share clicked");
        if (exportBusy || !hasPoster || !isConfirmed)
            return;
        setShareBusy(true);
        try {
            const dataUrl = await buildPosterDataUrl();
            if (!dataUrl) {
                setExportMessage("Could not prepare the poster image to share.");
                setShareUnsupportedOpen(true);
                return;
            }
            setPosterDataUrl(dataUrl);
            const blob = dataUrlToBlob(dataUrl);
            const filename = `bizboost-poster-${draftIdForFilename}.png`;
            const file = new File([blob], filename, { type: "image/png", lastModified: Date.now() });

            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                try {
                    if (!navigator.canShare || navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: "BizBoost Poster",
                            text: (draft?.caption || "").slice(0, 2000),
                        });
                        return;
                    }
                }
                catch (err) {
                    const e = err as Error;
                    if (e?.name === "AbortError")
                        return;
                    console.warn("[Poster Preview] navigator.share with file failed:", e);
                }
            }

            const nextUrl = URL.createObjectURL(blob);
            setShareImageUrl((prev) => {
                if (prev)
                    URL.revokeObjectURL(prev);
                return nextUrl;
            });
            const opened = typeof window !== "undefined" ? window.open(nextUrl, "_blank", "noopener,noreferrer") : null;
            if (!opened)
                triggerAnchorDownload(blob, filename);
            setShareUnsupportedOpen(true);
            setExportMessage("");
        }
        catch (error) {
            const err = error as Error;
            if (err?.name !== "AbortError") {
                setShareUnsupportedOpen(true);
                setExportMessage("Share failed. Try again.");
            }
        }
        finally {
            setShareBusy(false);
        }
    }, [buildPosterDataUrl, draft?.caption, draftIdForFilename, exportBusy, hasPoster, isConfirmed]);
    const copyCaption = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(draft?.caption || "");
            setCaptionCopied(true);
            setTimeout(() => setCaptionCopied(false), 1400);
        }
        catch {
            setCaptionCopied(false);
        }
    }, [draft?.caption]);
    useEffect(() => {
        return () => {
            if (shareImageUrl)
                URL.revokeObjectURL(shareImageUrl);
        };
    }, [shareImageUrl]);
    const effectivePosterDesign: PosterDesign = useMemo(() => {
        const base: PosterDesign = draft?.posterDesign
            ? { ...DEFAULT_POSTER_DESIGN, ...draft.posterDesign }
            : { ...DEFAULT_POSTER_DESIGN };
        if (draft?.posterStyle)
            base.style = draft.posterStyle;
        return base;
    }, [draft?.posterDesign, draft?.posterStyle]);
    return (<div className="posterPage">
      <div id="poster-export-mount" className="posterExportMount" aria-hidden="true">
        {!loading && draft?.imageDataUrl ? (<PosterTemplate key={`${draft?._id ?? "draft"}-${draft.imageDataUrl.length}`} imageUrl={draft.imageDataUrl} design={effectivePosterDesign}/>) : null}
      </div>
      <div className="posterShell">
        <section className="posterCanvas">
          <div className="posterViewport">
            <div id="poster-canvas" ref={posterRef} className="posterFrame">
              {loading ? (<div className="placeholder">Loading draft...</div>) : draft?.imageDataUrl ? (<PosterTemplate imageUrl={draft.imageDataUrl} design={effectivePosterDesign}/>) : (<div className="placeholder">No draft image found.</div>)}
            </div>
          </div>
        </section>

        <aside className="actionsCard">
          <h1>Poster Preview</h1>
          <p>Review your poster output before sharing or downloading.</p>

          {isConfirmed && (<div className="confirmedPill" role="status">
              Poster confirmed
            </div>)}
          {exportMessage ? <p className="shareSheetHint">{exportMessage}</p> : null}

          <div className="actionStack">
            <button type="button" className="secondaryBtn fullWidth" disabled={exportBusy} onClick={() => router.push("/biz-editor")}>
              Back
            </button>

            <button type="button" className="primaryBtn fullWidth" disabled={actionsLocked || !hasPoster || isConfirmed || exportBusy} onClick={() => void confirmPoster()}>
              {confirmBusy ? "Confirming..." : isConfirmed ? "Poster confirmed" : "Confirm Poster"}
            </button>

            <div className="actionRow">
              <button type="button" className="secondaryBtn flex1" disabled={!hasPoster || !isConfirmed || exportBusy} onClick={() => void handleDownload()}>
                {downloadBusy ? "Exporting..." : "Download"}
              </button>
              <button type="button" className="secondaryBtn flex1" disabled={!hasPoster || !isConfirmed || exportBusy} onClick={() => void handleShare()}>
                {shareBusy ? "Exporting..." : "Share"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {shareUnsupportedOpen && (<div className="shareBackdrop" role="dialog" aria-modal="true" aria-labelledby="shareUnsupportedTitle" onClick={(e) => {
                if (e.target === e.currentTarget)
                    setShareUnsupportedOpen(false);
            }}>
          <div className="shareSheet">
            <div className="shareSheetHead">
              <h2 id="shareUnsupportedTitle">Share poster image</h2>
              <button type="button" className="iconClose" onClick={() => setShareUnsupportedOpen(false)} aria-label="Close">
                x
              </button>
            </div>
            <p className="shareSheetHint">This is your exported poster (square PNG)—not the review page. Download or open it, then attach it in Instagram, WhatsApp, etc.</p>
            {shareImageUrl ? (<div className="sharePosterPreviewWrap">
                <img src={shareImageUrl} alt="" className="sharePosterPreview"/>
              </div>) : null}
            <div className="unsupportedActions">
              <button type="button" className="primaryBtn fullWidth" disabled={exportBusy} onClick={() => void handleDownload()}>
                Download poster PNG
              </button>
              {shareImageUrl ? (<a className="secondaryBtn fullWidth shareLinkBtn" href={shareImageUrl} download={`bizboost-poster-${draftIdForFilename}.png`}>
                  Save image link
                </a>) : null}
              <p className="shareSectionLabel">Share link to this review page (caption + URL only, no image)</p>
              <a className="secondaryBtn fullWidth shareLinkBtn" href={fallbackShareLinks.whatsapp} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
              <a className="secondaryBtn fullWidth shareLinkBtn" href={fallbackShareLinks.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
              <a className="secondaryBtn fullWidth shareLinkBtn" href={fallbackShareLinks.x} target="_blank" rel="noopener noreferrer">
                X / Twitter
              </a>
              <a className="secondaryBtn fullWidth shareLinkBtn" href={fallbackShareLinks.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
              <a className="secondaryBtn fullWidth shareLinkBtn" href={fallbackShareLinks.telegram} target="_blank" rel="noopener noreferrer">
                Telegram
              </a>
              <button type="button" className="secondaryBtn fullWidth" onClick={() => void copyCaption()}>
                {captionCopied ? "Caption copied" : "Copy caption"}
              </button>
            </div>
          </div>
        </div>)}

      <style jsx>{`
        .posterPage {
          min-height: 100vh;
          padding: 28px 16px 12px;
          background: var(--page-bg);
        }
        .posterShell {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.35fr 0.65fr;
          gap: 14px;
        }
        .posterCanvas,
        .actionsCard {
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
          padding: 18px;
        }
        .posterViewport {
          position: relative;
          width: 100%;
        }
        .posterFrame {
          position: relative;
          width: 100%;
          max-width: min(100%, 560px);
          margin: 0 auto;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 14px;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        .placeholder {
          color: #94a3b8;
          font-size: 14px;
          margin: auto;
        }
        .posterExportMount {
          position: fixed;
          left: -10000px;
          top: 0;
          width: 1080px;
          height: 1080px;
          margin: 0;
          padding: 0;
          border: none;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          background: transparent;
        }
        .posterExportMount :global(.posterWrap) {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          aspect-ratio: auto !important;
        }
        .posterOverlayBottom {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 1;
        }
        .overlayCaption {
          border-radius: 10px;
          background: rgba(2, 6, 23, 0.72);
          color: #f8fafc;
          font-size: 13px;
          line-height: 1.45;
          padding: 10px 12px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .overlayHashtags {
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.55);
          color: #a5f3fc;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.4;
          padding: 8px 12px;
          word-break: break-word;
        }
        .actionsCard h1 {
          margin: 0;
          color: #0f172a;
          font-size: 30px;
        }
        .actionsCard p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
        }
        .confirmedPill {
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f5f5f5;
          border: 1px solid #e5e5e5;
          color: #111111;
          font-size: 13px;
          font-weight: 700;
        }
        .actionStack {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .actionRow {
          display: flex;
          gap: 10px;
        }
        .flex1 {
          flex: 1;
        }
        .fullWidth {
          width: 100%;
        }
        .primaryBtn {
          border: 1px solid #111111;
          background: #111111;
          color: #fff;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .primaryBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .secondaryBtn {
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: #fff;
          color: #334155;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .secondaryBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .shareBackdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: grid;
          place-items: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
        }
        .shareSheet {
          width: min(440px, 100%);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
          padding: 18px 18px 16px;
        }
        .shareSheetHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .shareSheetHead h2 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
        }
        .iconClose {
          border: none;
          background: rgba(241, 245, 249, 0.9);
          color: #475569;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }
        .shareSheetHint {
          margin: 8px 0 0;
          font-size: 13px;
          color: #64748b;
        }
        .sharePosterPreviewWrap {
          margin-top: 12px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: #0f172a;
          aspect-ratio: 1 / 1;
          max-height: min(52vh, 360px);
          margin-left: auto;
          margin-right: auto;
        }
        .sharePosterPreview {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .shareSectionLabel {
          margin: 10px 0 0;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
        }
        .unsupportedActions {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .shareLinkBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        @media (max-width: 980px) {
          .posterShell {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>);
}
