"use client";

import { useMemo, useState } from "react";
import type { PosterStyle } from "@/src/components/poster/PosterTemplate";
import {
  PosterTemplateCardMockup,
  categoryBadgeLabel,
  tagChipsFor,
  templateCardSubtitle,
} from "@/src/components/poster/PosterTemplateCardMockup";
import {
  POSTER_TEMPLATE_CATEGORY_LABELS,
  type PosterTemplateCategory,
  listPosterTemplatesByCategory,
  getAllPosterTemplateCategories,
} from "@/src/lib/posterTemplateCatalog";

export type PosterTemplatePickerTab = PosterTemplateCategory | "all";

type Props = {
  selectedTemplateId?: string | null;
  /** Active layout — used only for secondary highlight if id missing. */
  selectedStyle?: PosterStyle;
  /** Auto-picked template from day plan — shows “Recommended” chip. */
  recommendedTemplateId?: string | null;
  onPick: (templateId: string, layoutStyle: PosterStyle) => void;
};

export function PosterTemplatePicker({
  selectedTemplateId,
  selectedStyle,
  recommendedTemplateId,
  onPick,
}: Props) {
  const [tab, setTab] = useState<PosterTemplatePickerTab>("all");

  const filtered = useMemo(() => listPosterTemplatesByCategory(tab), [tab]);

  const tabs: PosterTemplatePickerTab[] = ["all", ...getAllPosterTemplateCategories()];

  return (
    <div className="templatePickerRoot">
      <div className="templatePickerHeading">
        <h3>Browse poster templates</h3>
        <p className="templatePickerLead">
          Each card shows composition, mood colours, and sample blocks for that layout family. Final posters keep your BizBoost typography and accent system.
        </p>
      </div>

      <div className="templateTabs" role="tablist" aria-label="Template categories">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`templateTab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            {key === "all" ? "All" : POSTER_TEMPLATE_CATEGORY_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="templateGrid">
        {filtered.map((tpl) => {
          const isActive =
            selectedTemplateId === tpl.id || (!selectedTemplateId && tpl.layoutType === selectedStyle);
          const isRecommended = !!(recommendedTemplateId && recommendedTemplateId === tpl.id);

          const chips = tagChipsFor(tpl);

          return (
            <button
              key={tpl.id}
              type="button"
              className={`templateCard ${isActive ? "selected" : ""}`}
              onClick={() => onPick(tpl.id, tpl.layoutType)}
              aria-pressed={isActive}
              aria-label={`Template ${tpl.name}`}
            >
              <span className="categoryPill">{categoryBadgeLabel(tpl.category)}</span>
              {isRecommended ? <span className="recRibbon">Recommended</span> : null}

              <div className={`templateThumbWrap ${isActive ? "thumbSelected" : ""}`}>
                <PosterTemplateCardMockup template={tpl} />
              </div>

              <div className="templateCardMeta">
                <span className="templateName">{tpl.name}</span>
                <span className="templateDesc">{templateCardSubtitle(tpl)}</span>
                <div className="chipRow">
                  {chips.map((c) => (
                    <span key={c} className="visualChip">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .templatePickerRoot {
          display: grid;
          gap: 12px;
        }
        .templatePickerHeading h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .templatePickerLead {
          margin: 6px 0 0;
          font-size: 12px;
          line-height: 1.45;
          color: #64748b;
          max-width: 52rem;
        }
        .templateTabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .templateTab {
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.6);
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .templateTab:hover {
          border-color: #0ea5e9;
          color: #0369a1;
        }
        .templateTab.active {
          border-color: #0369a1;
          background: rgba(14, 165, 233, 0.12);
          color: #0c4a6e;
          box-shadow: 0 0 0 1px rgba(3, 105, 161, 0.2);
        }
        .templateGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(186px, 1fr));
          gap: 10px;
          max-height: 460px;
          overflow-y: auto;
          padding: 4px 4px 10px;
          align-items: start;
          scrollbar-gutter: stable;
        }
        @media (min-width: 880px) {
          .templateGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        .templateCard {
          position: relative;
          text-align: left;
          cursor: pointer;
          border-radius: 14px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: #ffffff;
          padding: 9px 9px 11px;
          display: grid;
          gap: 8px;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        .templateCard:hover:not(.selected) {
          transform: translateY(-1px);
          border-color: rgba(203, 213, 225, 0.95);
          box-shadow:
            0 8px 22px rgba(15, 23, 42, 0.07),
            0 2px 4px rgba(15, 23, 42, 0.04);
        }
        .templateCard.selected {
          border: 2px solid #4f46e5;
          padding: 8px 8px 10px;
          box-shadow:
            0 0 0 4px rgba(79, 70, 229, 0.2),
            0 6px 20px rgba(79, 70, 229, 0.12),
            0 12px 36px rgba(15, 23, 42, 0.1);
          background: linear-gradient(180deg, #fafbff, #ffffff);
        }
        .templateCard.selected:hover {
          transform: translateY(-1px);
          box-shadow:
            0 0 0 4px rgba(79, 70, 229, 0.24),
            0 8px 26px rgba(79, 70, 229, 0.14),
            0 14px 40px rgba(15, 23, 42, 0.11);
        }
        .categoryPill {
          position: absolute;
          top: 9px;
          left: 9px;
          z-index: 3;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.86);
          color: #f8fafc;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
          max-width: calc(100% - 74px);
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .recRibbon {
          position: absolute;
          top: 9px;
          right: 9px;
          z-index: 3;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #334155;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(203, 213, 225, 0.9);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }
        .templateThumbWrap {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          aspect-ratio: 1 / 1;
          border: 1px solid rgba(15, 23, 42, 0.07);
          background: #0f172a;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
          transition: box-shadow 0.18s ease, outline 0.18s ease;
        }
        .templateThumbWrap.thumbSelected {
          outline: 2px solid rgba(79, 70, 229, 0.55);
          outline-offset: 0px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 0 0 3px rgba(79, 70, 229, 0.12),
            0 10px 24px rgba(15, 23, 42, 0.1);
        }
        .templateCardMeta {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .templateName {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }
        .templateDesc {
          font-size: 11px;
          line-height: 1.38;
          color: #64748b;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.5em;
        }
        .chipRow {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .visualChip {
          font-size: 8px;
          font-weight: 750;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 999px;
          background: rgba(248, 250, 252, 1);
          color: #575f74;
          border: 1px solid rgba(226, 232, 240, 0.98);
        }
      `}</style>
    </div>
  );
}
