"use client";
type BusinessProfileErrorModalProps = {
    open: boolean;
    onRetry: () => void;
    onBackToHome: () => void;
};
export default function BusinessProfileErrorModal({ open, onRetry, onBackToHome, }: BusinessProfileErrorModalProps) {
    if (!open)
        return null;
    return (<div className="businessProfileModalOverlay" role="presentation">
      <div className="businessProfileModalCard" role="dialog" aria-modal="true" aria-labelledby="business-profile-error-title" aria-describedby="business-profile-error-desc">
        <h2 id="business-profile-error-title" className="businessProfileModalTitle">
          Something went wrong
        </h2>
        <p id="business-profile-error-desc" className="businessProfileModalText">
          We couldn&apos;t load your business profile right now. Please try again.
        </p>

        <div className="businessProfileModalActions">
          <button type="button" className="btn primary" onClick={onRetry}>
            Retry
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
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(248, 250, 252, 0.76));
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
          padding: 28px;
          text-align: center;
          transform-origin: center;
          animation: gatePopIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
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
          background: rgba(255, 255, 255, 0.72);
          color: #0f172a;
          border-color: rgba(148, 163, 184, 0.34);
        }

        .businessProfileModalSecondary:hover {
          background: rgba(255, 255, 255, 0.9);
        }

        @keyframes gateFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes gatePopIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
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
    </div>);
}
