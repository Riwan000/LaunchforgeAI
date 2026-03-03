import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type PipelineResultInput = {
  positioning: {
    positioning_statement: string;
    value_proposition: string;
    taglines: string[];
    differentiation: string[];
    messaging_pillars: string[];
    category: string;
  };
  icp: {
    primary_icp: { role: string; company_size: string; industry: string; goals: string[] };
    secondary_icp: { role: string; company_size: string; industry: string };
    pain_points: string[];
    buying_triggers: string[];
    channels: string[];
    willingness_to_pay: string;
  };
  timeline: {
    phases: Array<{ name: string; days: string; activities: string[]; channels?: string[]; kpis?: Record<string, string> }>;
  };
  content: {
    linkedin_posts: string[];
    twitter_threads: string[];
    email_sequence: string[];
    landing_page_headlines: string[];
    ad_variations: string[];
    ctas: string[];
  };
  validation: {
    validation_score: number;
    tier: string;
    flags: string[];
    recommendations: string[];
    agent_scores: Record<string, number>;
  };
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const LINE_HEIGHT = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function truncate(text: string, max = 90): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function splitLines(text: string, maxChars = 88): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

export async function generatePDF(result: unknown): Promise<Buffer> {
  const r = result as PipelineResultInput;
  const pdfDoc = await PDFDocument.create();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const purple = rgb(0.424, 0.388, 1.0);
  const darkBg = rgb(0.102, 0.102, 0.18);
  const white = rgb(1, 1, 1);
  const textDark = rgb(0.1, 0.1, 0.17);
  const textMuted = rgb(0.29, 0.25, 0.5);
  const green = rgb(0.086, 0.639, 0.259);
  const yellow = rgb(0.851, 0.467, 0.024);
  const red = rgb(0.863, 0.149, 0.149);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function checkNewPage(needed = LINE_HEIGHT * 2) {
    if (y - needed < MARGIN + 20) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function drawText(text: string, x: number, size: number, font: typeof fontBold, color = textDark, wrap = false) {
    if (wrap) {
      const lines = splitLines(text, Math.floor(CONTENT_WIDTH / (size * 0.55)));
      for (const line of lines) {
        checkNewPage();
        page.drawText(line, { x, y, size, font, color });
        y -= LINE_HEIGHT;
      }
    } else {
      const safe = truncate(text, Math.floor(CONTENT_WIDTH / (size * 0.55)));
      checkNewPage();
      page.drawText(safe, { x, y, size, font, color });
      y -= LINE_HEIGHT;
    }
  }

  function sectionHeader(title: string) {
    y -= 8;
    checkNewPage(30);
    page.drawRectangle({ x: MARGIN, y: y - 4, width: CONTENT_WIDTH, height: 22, color: purple });
    page.drawText(title, { x: MARGIN + 8, y: y + 2, size: 12, font: fontBold, color: white });
    y -= 26;
  }

  function bullet(text: string, indent = 60) {
    const lines = splitLines(text, Math.floor((CONTENT_WIDTH - (indent - MARGIN)) / 9));
    for (let i = 0; i < lines.length; i++) {
      checkNewPage();
      page.drawText(i === 0 ? `• ${lines[i]}` : `  ${lines[i]}`, { x: indent, y, size: 10, font: fontRegular, color: textDark });
      y -= LINE_HEIGHT;
    }
  }

  function labelValue(label: string, value: string) {
    checkNewPage();
    page.drawText(`${label}:`, { x: 60, y, size: 10, font: fontBold, color: textMuted });
    const labelWidth = fontBold.widthOfTextAtSize(`${label}: `, 10);
    const safe = truncate(value, 75);
    page.drawText(safe, { x: 60 + labelWidth, y, size: 10, font: fontRegular, color: textDark });
    y -= LINE_HEIGHT;
  }

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 130, width: PAGE_WIDTH, height: 130, color: darkBg });
  page.drawText("LaunchForge AI", { x: MARGIN, y: PAGE_HEIGHT - 60, size: 26, font: fontBold, color: rgb(0.655, 0.545, 0.98) });
  page.drawText("GTM Strategy Report", { x: MARGIN, y: PAGE_HEIGHT - 86, size: 14, font: fontRegular, color: white });
  page.drawText(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { x: MARGIN, y: PAGE_HEIGHT - 108, size: 9, font: fontRegular, color: rgb(0.655, 0.545, 0.98) });
  y = PAGE_HEIGHT - 150;

  sectionHeader("Quality Validation");
  const tierColor = r.validation.tier === "PASS" ? green : r.validation.tier === "WARN" ? yellow : red;
  page.drawText(`${r.validation.validation_score}/100`, { x: 60, y, size: 32, font: fontBold, color: tierColor });
  page.drawText(r.validation.tier, { x: 155, y: y + 8, size: 14, font: fontBold, color: tierColor });
  y -= 40;

  if (r.validation.flags.length > 0) {
    drawText("Flags:", 60, 10, fontBold, yellow);
    r.validation.flags.forEach(f => bullet(f));
  }
  if (r.validation.recommendations.length > 0) {
    drawText("Recommendations:", 60, 10, fontBold, rgb(0.149, 0.388, 0.863));
    r.validation.recommendations.forEach(rec => bullet(rec));
  }

  sectionHeader("1. Positioning Strategy");
  labelValue("Category", r.positioning.category);
  drawText("Positioning Statement:", 60, 10, fontBold, textMuted);
  drawText(r.positioning.positioning_statement, 68, 10, fontRegular, textDark, true);
  drawText("Value Proposition:", 60, 10, fontBold, textMuted);
  drawText(r.positioning.value_proposition, 68, 10, fontRegular, textDark, true);
  drawText("Taglines:", 60, 10, fontBold, textMuted);
  r.positioning.taglines.forEach(t => bullet(`"${t}"`))
  drawText("Differentiation:", 60, 10, fontBold, textMuted);
  r.positioning.differentiation.forEach(d => bullet(d));

  sectionHeader("2. Ideal Customer Profile");
  drawText("Primary ICP", 60, 11, fontBold, textMuted);
  labelValue("Role", r.icp.primary_icp.role);
  labelValue("Company", `${r.icp.primary_icp.company_size} · ${r.icp.primary_icp.industry}`);
  drawText("Secondary ICP", 60, 11, fontBold, textMuted);
  labelValue("Role", r.icp.secondary_icp.role);
  labelValue("Company", `${r.icp.secondary_icp.company_size} · ${r.icp.secondary_icp.industry}`);
  drawText("Pain Points:", 60, 10, fontBold, textMuted);
  r.icp.pain_points.forEach(p => bullet(p));
  drawText("Buying Triggers:", 60, 10, fontBold, textMuted);
  r.icp.buying_triggers.forEach(t => bullet(t));
  labelValue("Willingness to Pay", r.icp.willingness_to_pay);

  sectionHeader("3. Launch Timeline");
  r.timeline.phases.forEach((phase, i) => {
    checkNewPage(40);
    page.drawText(`Phase ${i + 1}: ${phase.name}  (${phase.days})`, { x: 60, y, size: 11, font: fontBold, color: purple });
    y -= LINE_HEIGHT + 2;
    drawText("Activities:", 60, 10, fontBold, textMuted);
    phase.activities.forEach(a => bullet(a));
    if (phase.kpis && Object.keys(phase.kpis).length > 0) {
      drawText("KPIs:", 60, 10, fontBold, textMuted);
      for (const [k, v] of Object.entries(phase.kpis)) bullet(`${k}: ${v}`);
    }
    y -= 6;
  });

  sectionHeader("4. Content & Ad Copy");
  drawText("Landing Page Headlines:", 60, 10, fontBold, textMuted);
  r.content.landing_page_headlines.forEach(h => bullet(`"${h}"`))
  drawText("Ad Variations:", 60, 10, fontBold, textMuted);
  r.content.ad_variations.forEach(a => bullet(a));
  drawText("CTAs:", 60, 10, fontBold, textMuted);
  r.content.ctas.forEach(c => bullet(c));

  page.drawText("Generated by LaunchForge AI  •  Confidential", {
    x: MARGIN, y: 24, size: 9, font: fontRegular, color: rgb(0.58, 0.58, 0.58),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
