export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
export async function GET() {
    if (!process.env.MONGODB_URI) {
        return NextResponse.json({ ok: false, error: "MONGODB_URI not found in .env.local" }, { status: 500 });
    }
    try {
        const db = await getDb();
        await db.command({ ping: 1 });
        return NextResponse.json({ ok: true, message: "MongoDB connected ✅" });
    }
    catch (err: unknown) {
        console.error("GET /api/health/db failed:", err);
        return NextResponse.json({ ok: false, error: "mongo_connection_failed" }, { status: 500 });
    }
}
