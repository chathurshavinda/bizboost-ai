"use client";

import { FaExclamationCircle } from "react-icons/fa";

type BusinessProfileGateModalProps = {
  open: boolean;
  onGoToDetails: () => void;
  onBackToHome: () => void;
};

export default function BusinessProfileGateModal({
  open,
  onGoToDetails,
  onBackToHome,
}: BusinessProfileGateModalProps) {
  if (!open) return null;

  return (
    <div className="businessProfileModalOverlay" role="presentation">
      <div
        className="businessProfileModalCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-profile-gate-title"
        aria-describedby="business-profile-gate-desc"
      >
        <div className="businessProfileModalIconWrap" aria-hidden="true">
          <FaExclamationCircle size={24} />
        </div>

        <h2 id="business-profile-gate-title" className="businessProfileModalTitle">
          Fill business details first
        </h2>
        <p id="business-profile-gate-desc" className="businessProfileModalText">
          Save your business profile in Business Details to view it here.
        </p>

        <div className="businessProfileModalActions">
          <button type="button" className="btn primary" onClick={onGoToDetails}>
            Go to Business Details
          </button>
          <button type="button" className="btn businessProfileModalSecondary" onClick={onBackToHome}>
            Back to Home
          </button>
        </div>
      </div>

      <style jsx>{`
        .businessProfileModalOverlay {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(2, 6, 23, 0.52);
          backdrop-filter: blur(14px);
          animation: gateFadeIn 180ms ease-out;
        }

        .businessProfileModalCard {
          width: min(100%, 520px);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.38);
          background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(248,250,252,0.76));
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
          padding: 28px;
          text-align: center;
          transform-origin: center;
          animation: gatePopIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .businessProfileModalIconWrap {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          margin: 0 auto 14px;
          display: grid;
          place-items: center;
          color: #4f46e5;
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(59,130,246,0.10));
          border: 1px solid rgba(99,102,241,0.18);
        }

        .businessProfileModalTitle {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
          color: #0f172a;
        }

        .businessProfileModalText {
          margin: 10px 0 0;
          color: #475569;
          font-size: 15px;
          line-height: 1.6;
        }

        .businessProfileModalActions {
          margin-top: 22px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .businessProfileModalSecondary {
          background: rgba(255,255,255,0.72);
          color: #0f172a;
          border-color: rgba(148,163,184,0.34);
        }

        .businessProfileModalSecondary:hover {
          background: rgba(255,255,255,0.9);
        }

        @keyframes gateFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes gatePopIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 640px) {
          .businessProfileModalCard {
            padding: 22px;
            border-radius: 22px;
          }

          .businessProfileModalTitle {
            font-size: 20px;
          }

          .businessProfileModalActions {
            flex-direction: column;
          }

          .businessProfileModalActions :global(.btn) {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .businessProfileModalOverlay,
          .businessProfileModalCard {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
