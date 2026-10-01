import { checkDatabaseHealth } from "@/db/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await checkDatabaseHealth();
    return Response.json({ status: "ok" }, { headers: noStoreHeaders });
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
