"use client";
import { useMemo, useState } from "react";
import type { PosterStyle } from "@/src/components/poster/PosterTemplate";
import { PosterTemplateCardMockup, categoryBadgeLabel, tagChipsFor, templateCardSubtitle, } from "@/src/components/poster/PosterTemplateCardMockup";
import { POSTER_TEMPLATE_CATEGORY_LABELS, type PosterTemplateCategory, listPosterTemplatesByCategory, getAllPosterTemplateCategories, } from "@/src/lib/posterTemplateCatalog";
export type PosterTemplatePickerTab = PosterTemplateCategory | "all";
type Props = {
    selectedTemplateId?: string | null;
    selectedStyle?: PosterStyle;
    recommendedTemplateId?: string | null;
    onPick: (templateId: string, layoutStyle: PosterStyle) => void;
};
export function PosterTemplatePicker({ selectedTemplateId, selectedStyle, recommendedTemplateId, onPick, }: Props) {
    const [tab, setTab] = useState<PosterTemplatePickerTab>("all");
    const filtered = useMemo(() => listPosterTemplatesByCategory(tab), [tab]);
    const tabs: PosterTemplatePickerTab[] = ["all", ...getAllPosterTemplateCategories()];
    return (<div className="templatePickerRoot">

      <div className="templatePickerHeading">

        <h3>Browse poster templates</h3>

        <p className="templatePickerLead">

          Each card shows composition, mood colours, and sample blocks for that layout family. Final posters keep your BizBoost typography and accent system.

        </p>

      </div>



      <div className="templateTabs" role="tablist" aria-label="Template categories">

        {tabs.map((key) => (<button key={key} type="button" role="tab" aria-selected={tab === key} className={`templateTab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>

            {key === "all" ? "All" : POSTER_TEMPLATE_CATEGORY_LABELS[key]}

          </button>))}

      </div>



      <div className="templateGrid">

        {filtered.map((tpl) => {
            const isActive = selectedTemplateId === tpl.id || (!selectedTemplateId && tpl.layoutType === selectedStyle);
            const isRecommended = !!(recommendedTemplateId && recommendedTemplateId === tpl.id);
            const chips = tagChipsFor(tpl);
            return (<button key={tpl.id} type="button" className={`templateCard ${isActive ? "selected" : ""}`} onClick={() => onPick(tpl.id, tpl.layoutType)} aria-pressed={isActive} aria-label={`Template ${tpl.name}`}>

              <span className="categoryPill">{categoryBadgeLabel(tpl.category)}</span>

              {isRecommended ? <span className="recRibbon">Recommended</span> : null}

              <div className={`templateThumbWrap ${isActive ? "thumbSelected" : ""}`}>

                <PosterTemplateCardMockup template={tpl}/>

                {isActive ? <span className="selectedCheck" aria-hidden="true">✓</span> : null}

              </div>



              <div className="templateCardMeta">

                <span className="templateName">{tpl.name}</span>

                <span className="templateDesc">{templateCardSubtitle(tpl)}</span>

                <div className="chipRow">

                  {chips.map((c) => (<span key={c} className="visualChip">

                      {c}

                    </span>))}

                </div>

              </div>

            </button>);
        })}

      </div>



      <style jsx>{`

        .templatePickerRoot {

          display: grid;

          gap: 14px;

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

          gap: 8px;

        }

        .templateTab {

          border-radius: 999px;

          border: 1px solid rgba(148, 163, 184, 0.42);

          background: rgba(255, 255, 255, 0.72);

          padding: 7px 13px;

          font-size: 12px;

          font-weight: 700;

          color: #475569;

          cursor: pointer;

          transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease,
            box-shadow 0.15s ease;

        }

        .templateTab:hover {

          border-color: rgba(71, 85, 105, 0.46);

          color: #1e293b;

          box-shadow: 0 5px 14px rgba(15, 23, 42, 0.06);

        }

        .templateTab.active {

          border-color: rgba(51, 65, 85, 0.66);

          background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.92));

          color: #0f172a;

          box-shadow:
            0 0 0 1px rgba(100, 116, 139, 0.16),
            0 6px 18px rgba(15, 23, 42, 0.07);

        }

        .templateGrid {

          display: grid;

          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));

          gap: 18px;

          max-height: 560px;

          overflow-y: auto;

          padding: 8px 10px 16px;

          align-items: start;

          scrollbar-gutter: stable;

        }

        @media (min-width: 880px) {

          .templateGrid {

            grid-template-columns: repeat(3, minmax(0, 1fr));

          }

        }

        @media (min-width: 1200px) {

          .templateGrid {

            grid-template-columns: repeat(4, minmax(0, 1fr));

          }

        }

        .templateCard {

          position: relative;

          box-sizing: border-box;

          text-align: left;

          cursor: pointer;

          border-radius: 16px;

          border: 2px solid rgba(214, 221, 230, 0.72);

          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);

          padding: 14px 14px 16px;

          display: grid;

          gap: 10px;

          transition:

            transform 0.18s ease,

            border-color 0.18s ease,

            box-shadow 0.18s ease,

            background 0.18s ease;

          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 5px 14px rgba(15, 23, 42, 0.055);

        }

        .templateCard:hover:not(.selected) {

          transform: translateY(-2px);

          border-color: rgba(188, 198, 210, 0.9);

          box-shadow:

            0 14px 30px rgba(15, 23, 42, 0.1),

            0 2px 6px rgba(15, 23, 42, 0.06);

        }

        .templateCard.selected {

          border-color: #334155;

          box-shadow:

            0 0 0 4px rgba(51, 65, 85, 0.12),

            0 10px 26px rgba(51, 65, 85, 0.15),

            0 12px 36px rgba(15, 23, 42, 0.1);

          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);

        }

        .templateCard.selected:hover {

          transform: translateY(-2px);

          box-shadow:

            0 0 0 4px rgba(51, 65, 85, 0.16),

            0 14px 32px rgba(51, 65, 85, 0.19),

            0 14px 40px rgba(15, 23, 42, 0.11);

        }

        .categoryPill {

          position: absolute;

          top: 12px;

          left: 12px;

          z-index: 3;

          font-size: 9px;

          font-weight: 800;

          letter-spacing: 0.12em;

          text-transform: uppercase;

          padding: 4px 10px;

          border-radius: 999px;

          background: rgba(15, 23, 42, 0.78);

          color: #f8fafc;

          border: 1px solid rgba(255, 255, 255, 0.16);

          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);

          max-width: calc(100% - 74px);

          overflow: hidden;

          white-space: nowrap;

          text-overflow: ellipsis;

        }

        .recRibbon {

          position: absolute;

          top: 12px;

          right: 12px;

          z-index: 3;

          font-size: 8px;

          font-weight: 800;

          letter-spacing: 0.14em;

          text-transform: uppercase;

          color: #334155;

          padding: 4px 10px;

          border-radius: 999px;

          background: rgba(255, 255, 255, 0.94);

          border: 1px solid rgba(203, 213, 225, 0.9);

          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);

        }

        .selectedCheck {

          position: absolute;

          right: 10px;

          bottom: 10px;

          z-index: 4;

          display: grid;

          place-items: center;

          width: 24px;

          height: 24px;

          border-radius: 999px;

          background: rgba(15, 23, 42, 0.9);

          color: #ffffff;

          border: 1px solid rgba(255, 255, 255, 0.3);

          font-size: 13px;

          font-weight: 900;

          box-shadow:
            0 0 0 3px rgba(15, 23, 42, 0.08),
            0 8px 18px rgba(15, 23, 42, 0.2);

        }

        .templateThumbWrap {

          position: relative;

          border-radius: 14px;

          overflow: hidden;

          aspect-ratio: 5 / 4;

          border: 1px solid rgba(148, 163, 184, 0.28);

          background: linear-gradient(160deg, #f8fafc, #e2e8f0);

          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            0 12px 26px rgba(15, 23, 42, 0.08);

          transition:
            box-shadow 0.18s ease,
            outline-color 0.18s ease;

        }

        .templateThumbWrap.thumbSelected {

          box-shadow:

            inset 0 1px 0 rgba(255, 255, 255, 0.06),

            0 14px 30px rgba(15, 23, 42, 0.12);

        }

        .templateCardMeta {

          display: flex;

          flex-direction: column;

          gap: 6px;

          min-width: 0;

        }

        .templateName {

          font-size: 13px;

          font-weight: 800;

          color: #0f172a;

          line-height: 1.25;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

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

          gap: 5px;

        }

        .visualChip {

          font-size: 8px;

          font-weight: 750;

          letter-spacing: 0.06em;

          text-transform: uppercase;

          padding: 2px 6px;

          border-radius: 999px;

          background: rgba(248, 250, 252, 0.9);

          color: #4b5563;

          border: 1px solid rgba(214, 221, 230, 0.9);

        }

      `}</style>

    </div>);
}
