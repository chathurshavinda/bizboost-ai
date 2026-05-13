export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
export async function GET() {
    try {
        const db = await getDb();
        const sampleUser = {
            firebase_uid: "sample_firebase_uid_001",
            email: "sample.user@bizboost.ai",
            display_name: "Sample User",
            created_at: new Date(),
        };
        const result = await db.collection("users").insertOne(sampleUser);
        return NextResponse.json({
            ok: true,
            insertedId: result.insertedId.toString(),
        });
    }
    catch (error: any) {
        return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
    }
}
