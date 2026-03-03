import { NextRequest, NextResponse } from "next/server";
import { getPipelineResult } from "@/lib/pipeline/controller";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const result = await getPipelineResult(runId);
  if (!result) return NextResponse.json({ error: "Result not ready or run not found" }, { status: 404 });
  return NextResponse.json(result);
}
