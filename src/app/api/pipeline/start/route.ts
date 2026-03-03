import { NextRequest, NextResponse } from "next/server";
import { UserFormPayloadSchema } from "@/lib/schemas/v1";
import { startPipeline } from "@/lib/pipeline/controller";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = UserFormPayloadSchema.parse({ ...body, schema_version: "1.0" });
    const run_id = await startPipeline(payload);
    return NextResponse.json({ run_id }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
