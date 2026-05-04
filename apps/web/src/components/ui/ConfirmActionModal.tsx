"use client";

import { useEffect } from "react";

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmActionModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  confirming = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="confirmOverlay" onClick={onCancel}>
      <div
        className="confirmCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-action-title">{title}</h3>
        <p>{message}</p>
        <div className="confirmActions">
          <button type="button" className="confirmBtn secondary" onClick={onCancel} disabled={confirming}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirmBtn ${danger ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>

      <style jsx>{`
        .confirmOverlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .confirmCard {
          width: min(100%, 420px);
          border-radius: 20px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);
          backdrop-filter: blur(16px);
          padding: 18px;
        }

        h3 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          line-height: 1.2;
        }

        p {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.55;
        }

        .confirmActions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .confirmBtn {
          border-radius: 12px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .confirmBtn.secondary {
          border-color: rgba(148, 163, 184, 0.45);
          background: rgba(255, 255, 255, 0.9);
          color: #334155;
        }

        .confirmBtn.primary {
          background: linear-gradient(145deg, #0f172a, #1e293b);
          color: #ffffff;
          border-color: rgba(15, 23, 42, 0.22);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.22);
        }

        .confirmBtn.danger {
          background: linear-gradient(145deg, #ef4444, #dc2626);
          color: #ffffff;
          border-color: rgba(220, 38, 38, 0.4);
          box-shadow: 0 10px 22px rgba(220, 38, 38, 0.24);
        }

        .confirmBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
