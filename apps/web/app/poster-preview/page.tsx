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
    const [imageCopied, setImageCopied] = useState(false);
    const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
    const posterRef = useRef<HTMLDivElement>(null);
    /** Blob for “Copy image” in the share fallback sheet (native share must stay synchronous; see handleShare). */
    const shareFallbackBlobRef = useRef<Blob | null>(null);
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

    const openShareFallbackSheet = useCallback((blob: Blob) => {
        shareFallbackBlobRef.current = blob;
        const nextUrl = URL.createObjectURL(blob);
        setShareImageUrl((prev) => {
            if (prev)
                URL.revokeObjectURL(prev);
            return nextUrl;
        });
        setShareUnsupportedOpen(true);
        setExportMessage("");
    }, []);

    /**
     * Web Share with files must be triggered with no prior `await` in the same event turn (Chrome / Safari user activation).
     * So we only call `navigator.share({ files })` when `posterDataUrl` is already in memory (after Confirm or background export).
     * If it is missing, we async-export then open the fallback sheet only (clipboard + download + links).
     */
    const handleShare = useCallback(() => {
        if (exportBusy || !hasPoster || !isConfirmed)
            return;
        setExportMessage("");

        const captionText = (draft?.caption || "").trim().slice(0, 2000);
        const filename = `bizboost-poster-${draftIdForFilename}.png`;

        /** No `setState` before `navigator.share` — React updates can drop user activation (Chrome). */
        const runNativeShareSync = (dataUrl: string) => {
            const blob = dataUrlToBlob(dataUrl);

            const finishOrFallback = () => {
                setShareBusy(false);
                openShareFallbackSheet(blob);
            };

            if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
                finishOrFallback();
                return;
            }

            const file = new File([blob], filename, { type: "image/png", lastModified: Date.now() });

            if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
                finishOrFallback();
                return;
            }

            const payload: ShareData = {
                files: [file],
                title: "BizBoost Poster",
                text: captionText,
            };

            navigator.share(payload)
                .catch((err: unknown) => {
                    const e = err as DOMException;
                    if (e?.name === "AbortError")
                        return;
                    console.warn("[Poster Preview] navigator.share:", err);
                    openShareFallbackSheet(blob);
                })
                .finally(() => {
                    setShareBusy(false);
                });
        };

        const cached = posterDataUrl;
        if (cached) {
            runNativeShareSync(cached);
            return;
        }

        setShareBusy(true);
        void buildPosterDataUrl()
            .then((built) => {
                setShareBusy(false);
                if (!built) {
                    setExportMessage("Could not prepare the poster image. Confirm the poster again, then tap Share.");
                    setShareUnsupportedOpen(true);
                    return;
                }
                setPosterDataUrl(built);
                const blob = dataUrlToBlob(built);
                shareFallbackBlobRef.current = blob;
            const nextUrl = URL.createObjectURL(blob);
            setShareImageUrl((prev) => {
                if (prev)
                    URL.revokeObjectURL(prev);
                return nextUrl;
            });
            setShareUnsupportedOpen(true);
                setExportMessage("Your browser needs a saved image to share here — use Copy image or Download, then paste or attach in your app.");
            })
            .catch(() => {
                setShareBusy(false);
                setExportMessage("Could not export the poster. Try Download.");
                setShareUnsupportedOpen(true);
            });
    }, [buildPosterDataUrl, draft?.caption, draftIdForFilename, exportBusy, hasPoster, isConfirmed, openShareFallbackSheet, posterDataUrl]);

    const copyPosterImageToClipboard = useCallback(async () => {
        const blob = shareFallbackBlobRef.current;
        if (!blob || typeof navigator === "undefined" || !navigator.clipboard?.write) {
            setExportMessage("Copy image is not supported in this browser—use Download.");
            return;
        }
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type || "image/png"]: blob }),
            ]);
            setImageCopied(true);
            window.setTimeout(() => setImageCopied(false), 1600);
        }
        catch {
            setExportMessage("Could not copy image. Use Download poster PNG.");
        }
    }, []);
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
    return (<div className="bb-page">
      <section className="bb-hero-dark">
        <div className="bb-hero-dark-inner bb-hero-centered mx-auto max-w-3xl text-center">
          <p className="bb-eyebrow-dark">Export</p>
          <h1 className="bb-title-dark">Poster Preview</h1>
          <p className="bb-lead-dark mx-auto">
            Review your poster, confirm when it looks right, then download or share to your channels.
          </p>
        </div>
      </section>

      <section className="bb-band-light">
        <div className="bb-shell">
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
          <p className="actionsEyebrow">Share kit</p>
          <h2 className="actionsTitle">Caption &amp; actions</h2>
          <p className="actionsLead">
            Copy your caption, confirm the poster, then export when you are ready.
          </p>

          {draft?.caption ? (<div className="metaBlock">
              <span className="metaLabel">Caption</span>
              <p className="metaCaption">{draft.caption}</p>
              <button type="button" className="miniGhostBtn" disabled={!draft.caption} onClick={() => void copyCaption()}>
                {captionCopied ? "Copied" : "Copy caption"}
              </button>
            </div>) : null}

          {(draft?.hashtags?.length ?? 0) > 0 ? (<div className="metaBlock">
              <span className="metaLabel">Hashtags</span>
              <div className="hashChipRow">
                {(draft?.hashtags ?? []).map((tag) => (<span key={tag} className="hashChip">
                    {tag}
                  </span>))}
              </div>
            </div>) : null}

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
        </div>
      </section>

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
              <button type="button" className="secondaryBtn fullWidth" onClick={() => void copyPosterImageToClipboard()}>
                {imageCopied ? "Image copied — paste into Instagram, etc." : "Copy image to clipboard"}
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
        .posterShell {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.35fr 0.65fr;
          gap: clamp(14px, 2.5vw, 22px);
          align-items: start;
        }
        .posterCanvas,
        .actionsCard {
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 250, 250, 0.94) 100%);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 22px 56px rgba(15, 23, 42, 0.09);
          backdrop-filter: blur(12px);
          padding: clamp(18px, 2.5vw, 22px);
        }
        .posterCanvas {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .posterViewport {
          position: relative;
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .posterFrame {
          position: relative;
          width: 100%;
          max-width: min(100%, 520px);
          margin: 0 auto;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.04);
          border: 1px solid rgba(226, 232, 240, 0.85);
          box-shadow: 0 28px 64px rgba(15, 23, 42, 0.14);
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
        .actionsEyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
        }
        .actionsTitle {
          margin: 8px 0 0;
          color: #0f172a;
          font-size: clamp(22px, 3vw, 26px);
          font-family: var(--font-playfair), Georgia, serif;
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .actionsLead {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.55;
        }
        .metaBlock {
          margin-top: 16px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: rgba(248, 250, 252, 0.85);
          display: grid;
          gap: 10px;
        }
        .metaLabel {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
        }
        .metaCaption {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: #334155;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .miniGhostBtn {
          justify-self: start;
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: #ffffff;
          color: #334155;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .miniGhostBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
        }
        .miniGhostBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .hashChipRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .hashChip {
          border-radius: 999px;
          border: 1px solid rgba(99, 102, 241, 0.28);
          background: rgba(238, 242, 255, 0.65);
          color: #4338ca;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 11px;
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
          border-radius: 999px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.2);
          transition: transform 0.18s ease, filter 0.18s ease;
        }
        .primaryBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.03);
        }
        .primaryBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .secondaryBtn {
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: #fff;
          color: #334155;
          border-radius: 999px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
        }
        .secondaryBtn:hover:not(:disabled) {
          transform: translateY(-1px);
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
          .posterCanvas {
            order: -1;
          }
        }
      `}</style>
    </div>);
}
