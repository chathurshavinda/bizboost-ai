import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firebase_uid = searchParams.get("firebase_uid")?.trim() ?? "";
    const dayNumber = Number(searchParams.get("dayNumber") ?? 0);

    if (!firebase_uid) {
      return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
    }

    if (!Number.isInteger(dayNumber) || dayNumber <= 0) {
      return NextResponse.json({ ok: false, error: "valid dayNumber is required" }, { status: 400 });
    }

    const db = await getDb();
    const poster = await db
      .collection("posters")
      .findOne({ firebase_uid, dayNumber }, { sort: { createdAt: -1 } });

    if (!poster) {
      return NextResponse.json({ ok: false, error: "poster_not_found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          dayNumber: poster.dayNumber,
          posterDataUrl: typeof poster.posterDataUrl === "string" ? poster.posterDataUrl : "",
          caption: typeof poster.caption === "string" ? poster.caption : "",
          hashtags: Array.isArray(poster.hashtags) ? poster.hashtags : [],
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("posters/by-day GET error:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch poster" }, { status: 500 });
  }
}
