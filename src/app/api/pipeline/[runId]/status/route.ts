import { NextRequest, NextResponse } from "next/server";
import { getPipelineStatus } from "@/lib/pipeline/controller";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const status = await getPipelineStatus(runId);
  if (!status) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json(status);
}
