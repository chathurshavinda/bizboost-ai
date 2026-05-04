import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const firebase_uid = new URL(req.url).searchParams.get("firebase_uid")?.trim() ?? "";

    if (!firebase_uid) {
      return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
    }

    const db = await getDb();
    const rows = await db
      .collection("day_status")
      .find({ firebase_uid })
      .project({ _id: 0, dayNumber: 1, completed: 1, updatedAt: 1 })
      .sort({ dayNumber: 1 })
      .toArray();

    return NextResponse.json({ ok: true, data: rows }, { status: 200 });
  } catch (error) {
    console.error("day status fetch error:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch day status" }, { status: 500 });
  }
}
