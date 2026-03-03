import { NextResponse } from "next/server";
import { listRuns } from "@/lib/pipeline/stateStore";

export async function GET() {
  try {
    const runs = listRuns();
    return NextResponse.json({ runs, total: runs.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
