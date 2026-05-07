import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
export async function GET() {
    try {
        const db = await getDb();
        await db.collection("business_profiles").createIndex({ firebase_uid: 1 }, { unique: true });
        return NextResponse.json({ ok: true });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
