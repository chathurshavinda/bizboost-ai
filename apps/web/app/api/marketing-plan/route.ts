import { NextResponse } from "next/server";
import { getDb } from "@/src/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firebase_uid = searchParams.get("firebase_uid");

    if (!firebase_uid) {
      return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
    }

    const db = await getDb();
    const plans = await db
      .collection("marketing_plans")
      .find({ firebase_uid })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json({ ok: true, data: plans }, { status: 200 });
  } catch (err) {
    console.error("marketing-plan GET error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load plans" }, { status: 500 });
  }
}
