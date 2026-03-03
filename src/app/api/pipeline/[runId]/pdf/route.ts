import { NextRequest, NextResponse } from "next/server";
import { getPipelineResult } from "@/lib/pipeline/controller";
import { generatePDF } from "@/lib/pdf/generator";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const result = await getPipelineResult(runId);
  if (!result) return NextResponse.json({ error: "Result not ready or run not found" }, { status: 404 });
  try {
    const pdf = await generatePDF(result);
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="launchforge-${runId}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("[PDF generation error]", err);
    return NextResponse.json(
      { error: "PDF generation failed. The run result exists but could not be exported." },
      { status: 500 }
    );
  }
}
