import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type DayPlan = {
  dayNumber?: number;
  dateLabel?: string;
  mainActionTitle?: string;
  businessGrowthAction?: string;
  executionSteps?: string[];
  postIdea?: string;
  caption?: string;
  hashtags?: string[];
  successMetric?: string;
  posterHint?: string;
};

type DownloadMarketingPlanPdfArgs = {
  businessName: string;
  planDays: number;
  planData: DayPlan[];
  filename?: string;
};

export function downloadMarketingPlanPdf({
  businessName,
  planDays,
  planData,
  filename,
}: DownloadMarketingPlanPdfArgs) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const safePlan = Array.isArray(planData) ? planData : [];
  const totalPages = Math.max(1, Number(planDays) || safePlan.length || 1);

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 42;
  const contentWidth = pageWidth - marginX * 2;

  Array.from({ length: totalPages }).forEach((_, index) => {
    const day = safePlan[index] ?? {};
    if (index > 0) doc.addPage();

    const steps = Array.isArray(day.executionSteps) ? day.executionSteps.filter(Boolean) : [];
    const hashtags = Array.isArray(day.hashtags) ? day.hashtags.filter(Boolean) : [];

    const dayNumber = Number(day.dayNumber ?? index + 1);
    const dateLabel = day.dateLabel?.trim() || `Day ${dayNumber}`;
    const actionTitle = day.mainActionTitle?.trim() || `Day ${dayNumber} Action`;
    const growthAction = day.businessGrowthAction?.trim() || "N/A";
    const postIdea = day.postIdea?.trim() || "N/A";
    const posterHint = day.posterHint?.trim() || "";
    const caption = day.caption?.trim() || "N/A";
    const successMetric = day.successMetric?.trim() || "N/A";
    const hashtagText = hashtags.length > 0 ? hashtags.join(", ") : "N/A";

    let y = 42;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("BizBoost Marketing Plan", marginX, y);

    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.text(`Business: ${businessName || "Your Business"}   |   Plan: ${planDays} Days`, marginX, y);
    doc.setTextColor(0, 0, 0);

    y += 28;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Day ${dayNumber} - ${dateLabel}`, marginX, y);

    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Main Action Title", marginX, y);
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(actionTitle, contentWidth), marginX, y);
    y += 22;

    doc.setFont("helvetica", "bold");
    doc.text("Business Growth Action", marginX, y);
    y += 15;
    doc.setFont("helvetica", "normal");
    const growthLines = doc.splitTextToSize(growthAction, contentWidth);
    doc.text(growthLines, marginX, y);
    y += growthLines.length * 13 + 10;

    doc.setFont("helvetica", "bold");
    doc.text("Execution Steps", marginX, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      head: [["Step"]],
      body: (steps.length > 0 ? steps : ["N/A"]).map((step) => [step]),
      styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255] },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.text("Post Idea", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const postIdeaLines = doc.splitTextToSize(postIdea, contentWidth);
    doc.text(postIdeaLines, marginX, y);
    y += postIdeaLines.length * 13 + 14;

    if (posterHint) {
      doc.setFont("helvetica", "bold");
      doc.text("Poster headline hint", marginX, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const hintLines = doc.splitTextToSize(posterHint, contentWidth);
      doc.text(hintLines, marginX, y);
      y += hintLines.length * 13 + 14;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Caption", marginX, y);
    y += 10;
    const captionLines = doc.splitTextToSize(caption, contentWidth - 20);
    const captionHeight = Math.max(60, captionLines.length * 13 + 16);
    doc.setDrawColor(210, 210, 210);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, y, contentWidth, captionHeight, 8, 8, "FD");
    doc.setFont("helvetica", "normal");
    doc.text(captionLines, marginX + 10, y + 16);
    y += captionHeight + 14;

    doc.setFont("helvetica", "bold");
    doc.text("Hashtags", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(hashtagText, contentWidth), marginX, y);
    y += 24;

    doc.setFont("helvetica", "bold");
    doc.text("Success Metric", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(successMetric, contentWidth), marginX, y);
  });

  doc.save(filename || "BizBoost_Marketing_Plan.pdf");
}
