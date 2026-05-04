"use client";

import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
import {
  DEFAULT_POSTER_DESIGN,
  PosterDesign,
  PosterTemplate,
} from "@/src/components/poster/PosterTemplate";

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

const FALLBACK_HASHTAGS = ["#SmallBusiness", "#BusinessGrowth", "#SupportLocal", "#BizBoostAI"];

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
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 12000);
        }),
    ),
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma) : dataUrl;
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : "";
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? "image/png";
  const binary = typeof atob === "function" ? atob(base64) : "";
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function posterNodeToDataUrl(node: HTMLElement): Promise<string> {
  await waitForImages(node);
  await waitForFontsAndPaint();
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width || node.offsetWidth || node.scrollWidth));
  const height = Math.max(1, Math.ceil(rect.height || node.offsetHeight || node.scrollHeight));

  // skipFonts avoids cross-origin stylesheet/font introspection failures in html-to-image
  try {
    return await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width,
      height,
      skipFonts: true,
    });
  } catch {
    try {
      // fallback pass for stricter browsers
      return await toPng(node, {
        cacheBust: true,
        pixelRatio: 1,
        backgroundColor: "#ffffff",
        width,
        height,
        skipFonts: true,
      });
    } catch {
      // last-resort fallback for environments where foreignObject export fails
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: false,
      });
      return canvas.toDataURL("image/png");
    }
  }
}

async function posterCanvasToDataUrl(): Promise<string | null> {
  const node = document.getElementById("poster-canvas");
  if (!node) return null;
  return posterNodeToDataUrl(node as HTMLElement);
}

function triggerAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  const isIOS =
    typeof navigator !== "undefined" &&
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

function buildCaptionLikeEditor(businessName: string, businessType: string, offer: string, variantSeed: number): string {
  const intros = [
    `At ${businessName}, we're focusing on ${offer} today.`,
    `Today at ${businessName}, we're highlighting ${offer}.`,
    `${businessName} is putting ${offer} front and center today.`,
  ];
  const intro = intros[Math.abs(variantSeed) % intros.length];
  return `${intro}\n\nIf you are in ${businessType}, this is a simple, practical step to attract more attention and convert interest into action.\n\nMessage us now to learn more and get started.`;
}

export default function PosterPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

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
  const actionsLocked = loading || regenerating;
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
    if (authLoading) return;
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
        const id =
          typeof data._id === "string"
            ? data._id
            : data._id && typeof (data._id as { toString?: () => string }).toString === "function"
              ? (data._id as { toString: () => string }).toString()
              : undefined;

        setDraft({
          ...data,
          _id: id,
          hashtags: Array.isArray(result?.data?.hashtags) ? result.data.hashtags : [],
          offerText: typeof data.offerText === "string" ? data.offerText : "",
          dayNumber: typeof data.dayNumber === "number" ? data.dayNumber : data.dayNumber === null ? null : Number(data.dayNumber) || null,
        } as Draft);
      } else {
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
    let node = posterRef.current ?? (document.getElementById("poster-canvas") as HTMLElement | null);
    if (!node) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      node = posterRef.current ?? (document.getElementById("poster-canvas") as HTMLElement | null);
    }
    if (!node) return null;
    return posterNodeToDataUrl(node);
  }, []);

  useEffect(() => {
    if (!hasPoster || loading || regenerating) return;
    let cancelled = false;

    const exportCurrentPreview = async () => {
      try {
        const next = await buildPosterDataUrl();
        if (cancelled) return;
        if (next) {
          setPosterDataUrl(next);
          setExportMessage("");
          console.log("posterDataUrl length", next.length);
        } else {
          setPosterDataUrl(null);
          setExportMessage("Poster export is not ready yet.");
        }
      } catch {
        if (cancelled) return;
        setPosterDataUrl(null);
        setExportMessage("Poster export failed. Try regenerate.");
      }
    };

    void exportCurrentPreview();
    return () => {
      cancelled = true;
    };
  }, [buildPosterDataUrl, hasPoster, loading, regenerating, draft?._id, draft?.caption, draft?.imageDataUrl]);

  const regeneratePoster = useCallback(async () => {
    if (!user?.uid || !draft?.imageDataUrl) return;

    setRegenerating(true);
    setExportMessage("");
    try {
      const businessRes = await fetch(`/api/business-profile?firebase_uid=${encodeURIComponent(user.uid)}`, {
        cache: "no-store",
      });
      const businessJson = await businessRes.json();
      const bp =
        businessRes.ok && businessJson?.ok
          ? (businessJson.data as Record<string, unknown>)
          : ({} as Record<string, unknown>);

      const businessName = String(bp.businessName ?? "").trim() || "your business";
      const businessType = String(bp.businessType ?? "").trim() || "SME";
      const city = String(bp.city ?? "").trim();
      const country = String(bp.country ?? "Sri Lanka").trim();
      const location = [city, country].filter(Boolean).join(", ") || "Sri Lanka";
      const products = Array.isArray(bp.productsOrServices)
        ? (bp.productsOrServices as unknown[]).filter(Boolean).join(", ")
        : String(bp.productsOrServices ?? "").trim();
      const targetCustomers = String(bp.targetCustomers ?? "").trim() || "Local customers";
      const businessGoal = String(bp.businessGoals ?? "").trim() || "Attract more customers";
      const budget =
        String(bp.monthlyMarketingBudget ?? bp.monthlyBusinessBudget ?? "").trim() || "Medium";
      const language = String(bp.language ?? "English").trim() || "English";

      const offer = String(draft.offerText ?? "").trim() || "today's featured offer";
      const existingHashtags =
        Array.isArray(draft.hashtags) && draft.hashtags.length > 0 ? draft.hashtags : FALLBACK_HASHTAGS;

      const baseBusinessDetails = {
        businessName,
        businessType,
        location,
        productsOrServices: products || businessType,
        targetCustomers,
        businessGoal,
        budget,
        language,
        offer,
        tone: "Friendly and professional",
        photoContext: "A real photo uploaded by the business owner",
      };

      const lockedStyle = draft.posterStyle || draft.posterDesign?.style || null;
      const prevDesign = draft.posterDesign || null;
      const variationSeed = `v${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;

      // 1) Ask Gemini for a NEW improved design variation, keeping the same locked style
      let nextDesign: PosterDesign | null = null;
      try {
        const designRes = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "poster-design",
            businessDetails: {
              ...baseBusinessDetails,
              lockedStyle: lockedStyle ?? "",
              avoidHeadline: prevDesign?.headline ?? "",
              avoidSubheadline: prevDesign?.subheadline ?? "",
              avoidAccentColor: prevDesign?.accentColor ?? "",
              variationHint: variationSeed,
            },
          }),
        });
        const designJson = await designRes.json();
        if (designRes.ok && designJson?.ok && designJson?.design) {
          nextDesign = designJson.design as PosterDesign;
        }
      } catch (err) {
        console.error("[Poster Preview] Regenerate design error:", err);
      }

      // Keep locked style even if Gemini fails — only fall back on text/colors
      const mergedDesign: PosterDesign = {
        ...DEFAULT_POSTER_DESIGN,
        ...(prevDesign || {}),
        ...(nextDesign || {}),
        style: (lockedStyle as PosterDesign["style"]) ||
          nextDesign?.style ||
          prevDesign?.style ||
          DEFAULT_POSTER_DESIGN.style,
      };

      // 2) Refresh the caption + hashtags with Gemini so the new variation is paired with fresh copy
      let newCaption = "";
      let newHashtags: string[] = existingHashtags;
      try {
        const captionRes = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "poster-caption",
            businessDetails: {
              ...baseBusinessDetails,
              dayPlan: `Regeneration: produce a fresh variant. Previous caption: ${draft.caption || ""}`,
              variationHint: variationSeed,
            },
          }),
        });
        const captionJson = await captionRes.json();
        if (captionRes.ok && captionJson?.ok && typeof captionJson.text === "string") {
          const text = String(captionJson.text);
          const capMatch = text.match(/Caption:\s*([\s\S]*?)(?:\n\s*Hashtags:|$)/i);
          const tagMatch = text.match(/Hashtags:\s*([\s\S]*)$/i);
          newCaption = (capMatch?.[1] || text).trim();
          if (tagMatch?.[1]) {
            const tags = tagMatch[1]
              .split(/\s+/)
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t) => (t.startsWith("#") ? t : `#${t}`));
            if (tags.length >= 2) newHashtags = tags.slice(0, 8);
          }
        }
      } catch (err) {
        console.error("[Poster Preview] Regenerate caption error:", err);
      }

      if (!newCaption) {
        newCaption = buildCaptionLikeEditor(
          businessName,
          businessType,
          offer,
          Math.floor(Math.random() * 1e9),
        );
      }

      // 3) Save a NEW draft with the new design + style + caption
      const response = await fetch("/api/caption-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebase_uid: user.uid,
          dayNumber:
            typeof draft.dayNumber === "number" && Number.isFinite(draft.dayNumber) && draft.dayNumber > 0
              ? draft.dayNumber
              : null,
          caption: newCaption,
          hashtags: newHashtags,
          imageName: draft.imageName || "uploaded-image",
          offerText: offer,
          imageDataUrl: draft.imageDataUrl,
          posterStyle: mergedDesign.style,
          posterDesign: mergedDesign,
        }),
      });

      const result = await response.json();
      if (response.ok && result?.ok && result?.data) {
        const newId = String(result.data.draftId ?? "");
        setDraft({
          ...result.data,
          hashtags: Array.isArray(result.data.hashtags) ? result.data.hashtags : newHashtags,
          posterStyle: mergedDesign.style,
          posterDesign: mergedDesign,
          _id: newId || undefined,
        });
        setIsConfirmed(false);
        setPosterDataUrl(null);
        if (newId) {
          router.replace(`/poster-preview?draftId=${encodeURIComponent(newId)}`);
        }
      } else {
        setExportMessage("Could not regenerate. Please try again.");
      }
    } catch (error) {
      console.error("[Poster Preview] Regenerate failed:", error);
      setExportMessage("Regeneration failed. Try again.");
    } finally {
      setRegenerating(false);
    }
  }, [draft, router, user?.uid]);

  const confirmPoster = useCallback(async () => {
    console.log("confirm clicked");
    if (exportBusy || !hasPoster) return;
    setConfirmBusy(true);
    try {
      const dataUrl = posterDataUrl || (await buildPosterDataUrl());
      if (!dataUrl) return;
      setPosterDataUrl(dataUrl);
      console.log("posterDataUrl length", dataUrl?.length);
      setIsConfirmed(true);
      setExportMessage("");
    } catch (error) {
      console.error("[Poster Preview] Confirm poster failed:", error);
      const message = error instanceof Error ? error.message : "unknown_export_error";
      setExportMessage(`Could not confirm poster. Try again. (${message})`);
    } finally {
      setConfirmBusy(false);
    }
  }, [buildPosterDataUrl, exportBusy, hasPoster, posterDataUrl]);

  const handleDownload = useCallback(async () => {
    console.log("download clicked");
    if (exportBusy || !hasPoster || !isConfirmed) return;
    setDownloadBusy(true);
    try {
      const dataUrl = posterDataUrl || (await buildPosterDataUrl());
      if (!dataUrl) {
        setExportMessage("Download failed: poster export unavailable.");
        return;
      }
      setPosterDataUrl(dataUrl);
      console.log("posterDataUrl length", dataUrl?.length);
      const blob = dataUrlToBlob(dataUrl);
      triggerAnchorDownload(blob, `bizboost-poster-${draftIdForFilename}.png`);
    } catch (error) {
      console.error("[Poster Preview] Download failed:", error);
      setExportMessage("Download failed. Try again.");
    } finally {
      setDownloadBusy(false);
    }
  }, [buildPosterDataUrl, draftIdForFilename, exportBusy, hasPoster, isConfirmed, posterDataUrl]);

  const handleShare = useCallback(async () => {
    console.log("share clicked");
    if (exportBusy || !hasPoster || !isConfirmed) return;
    setShareBusy(true);
    try {
      const dataUrl = posterDataUrl || (await buildPosterDataUrl());
      if (!dataUrl) {
        setShareUnsupportedOpen(true);
        return;
      }

      setPosterDataUrl(dataUrl);
      console.log("posterDataUrl length", dataUrl?.length);
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], "bizboost-poster.png", { type: "image/png" });
      const payload: ShareData = { files: [file] };

      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.(payload)) {
        await navigator.share({ files: [file], title: "BizBoost Poster", text: draft?.caption || "" });
        return;
      }

      const nextUrl = URL.createObjectURL(blob);
      setShareImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
      setShareUnsupportedOpen(true);
      setExportMessage("");
    } catch (error) {
      const err = error as Error;
      if (err?.name !== "AbortError") {
        setShareUnsupportedOpen(true);
        setExportMessage("Share failed. Try again.");
      }
    } finally {
      setShareBusy(false);
    }
  }, [buildPosterDataUrl, draft?.caption, exportBusy, hasPoster, isConfirmed, posterDataUrl]);

  const copyCaption = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(draft?.caption || "");
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 1400);
    } catch {
      setCaptionCopied(false);
    }
  }, [draft?.caption]);

  useEffect(() => {
    return () => {
      if (shareImageUrl) URL.revokeObjectURL(shareImageUrl);
    };
  }, [shareImageUrl]);

  const effectivePosterDesign: PosterDesign = useMemo(() => {
    const base: PosterDesign = draft?.posterDesign
      ? { ...DEFAULT_POSTER_DESIGN, ...draft.posterDesign }
      : { ...DEFAULT_POSTER_DESIGN };
    if (draft?.posterStyle) base.style = draft.posterStyle;
    return base;
  }, [draft?.posterDesign, draft?.posterStyle]);

  return (
    <div className="posterPage">
      <div className="posterShell">
        <section className="posterCanvas">
          <div className="posterViewport">
            <div id="poster-canvas" ref={posterRef} className={`posterFrame ${regenerating ? "posterFrameDim" : ""}`} aria-busy={regenerating}>
              {loading ? (
                <div className="placeholder">Loading draft...</div>
              ) : draft?.imageDataUrl ? (
                <PosterTemplate imageUrl={draft.imageDataUrl} design={effectivePosterDesign} />
              ) : (
                <div className="placeholder">No draft image found.</div>
              )}
            </div>
            {regenerating && (
              <div className="posterBusyOverlay" role="status">
                <span className="posterBusySpinner" aria-hidden />
                Regenerating poster...
              </div>
            )}
          </div>
        </section>

        <aside className="actionsCard">
          <h1>Poster Preview</h1>
          <p>Review your poster output before sharing or downloading.</p>

          {isConfirmed && (
            <div className="confirmedPill" role="status">
              Poster confirmed
            </div>
          )}
          {exportMessage ? <p className="shareSheetHint">{exportMessage}</p> : null}

          <div className="actionStack">
            <button type="button" className="secondaryBtn fullWidth" disabled={regenerating || exportBusy} onClick={() => router.push("/biz-editor")}>
              Back
            </button>

            <button
              type="button"
              className="outlineAccentBtn fullWidth"
              disabled={actionsLocked || !hasPoster || exportBusy}
              onClick={() => void regeneratePoster()}
            >
              {regenerating ? "Regenerating..." : "Regenerate Poster"}
            </button>

            <button
              type="button"
              className="primaryBtn fullWidth"
              disabled={actionsLocked || !hasPoster || isConfirmed || exportBusy}
              onClick={() => void confirmPoster()}
            >
              {confirmBusy ? "Confirming..." : isConfirmed ? "Poster confirmed" : "Confirm Poster"}
            </button>

            <div className="actionRow">
              <button
                type="button"
                className="secondaryBtn flex1"
                disabled={regenerating || !hasPoster || !isConfirmed || exportBusy}
                onClick={() => void handleDownload()}
              >
                {downloadBusy ? "Exporting..." : "Download"}
              </button>
              <button
                type="button"
                className="secondaryBtn flex1"
                disabled={regenerating || !hasPoster || !isConfirmed || exportBusy}
                onClick={() => void handleShare()}
              >
                {shareBusy ? "Exporting..." : "Share"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {shareUnsupportedOpen && (
        <div
          className="shareBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shareUnsupportedTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShareUnsupportedOpen(false);
          }}
        >
          <div className="shareSheet">
            <div className="shareSheetHead">
              <h2 id="shareUnsupportedTitle">Sharing not supported</h2>
              <button type="button" className="iconClose" onClick={() => setShareUnsupportedOpen(false)} aria-label="Close">
                x
              </button>
            </div>
            <p className="shareSheetHint">Native image share is unavailable. Use these fallback options.</p>
            <div className="unsupportedActions">
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
              <button type="button" className="primaryBtn fullWidth" disabled={exportBusy} onClick={() => void handleDownload()}>
                Download Poster
              </button>
              <button type="button" className="secondaryBtn fullWidth" onClick={() => void copyCaption()}>
                {captionCopied ? "Caption copied" : "Copy caption"}
              </button>
            </div>
          </div>
        </div>
      )}

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
          overflow: hidden;
          border-radius: 14px;
          background: transparent;
          display: flex;
          flex-direction: column;
        }
        .posterFrameDim {
          filter: brightness(0.92);
        }
        .posterBusyOverlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(15, 23, 42, 0.35);
          color: #f8fafc;
          font-size: 14px;
          font-weight: 700;
          z-index: 2;
        }
        .posterBusySpinner {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 3px solid rgba(248, 250, 252, 0.35);
          border-top-color: #38bdf8;
          animation: spin 0.75s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .posterFrame img {
          display: block;
          width: 100%;
          height: 100%;
          min-height: 520px;
          object-fit: cover;
        }
        .placeholder {
          color: #94a3b8;
          font-size: 14px;
          margin: auto;
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
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #047857;
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
          border: 1px solid rgba(16, 185, 129, 0.3);
          background: linear-gradient(145deg, #10b981, #059669);
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
        .outlineAccentBtn {
          border: 1px solid rgba(14, 165, 233, 0.45);
          background: rgba(240, 249, 255, 0.95);
          color: #0369a1;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .outlineAccentBtn:disabled {
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
          .posterFrame {
            min-height: 420px;
          }
        }
      `}</style>
    </div>
  );
}
