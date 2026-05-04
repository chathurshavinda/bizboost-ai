import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const firebase_uid = typeof body?.firebase_uid === "string" ? body.firebase_uid.trim() : "";
    const dayNumber = Number(body?.dayNumber ?? 0);
    const posterDataUrl = typeof body?.posterDataUrl === "string" ? body.posterDataUrl : "";
    const caption = typeof body?.caption === "string" ? body.caption : "";
    const hashtags = Array.isArray(body?.hashtags) ? body.hashtags : [];

    if (!firebase_uid) {
      return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
    }
    if (!Number.isFinite(dayNumber) || dayNumber <= 0) {
      return NextResponse.json({ ok: false, error: "dayNumber is required" }, { status: 400 });
    }
    if (!posterDataUrl) {
      return NextResponse.json({ ok: false, error: "posterDataUrl is required" }, { status: 400 });
    }

    const doc = {
      firebase_uid,
      dayNumber,
      posterDataUrl,
      caption,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      confirmed: true,
      createdAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection("posters").insertOne(doc);

    return NextResponse.json(
      {
        ok: true,
        data: {
          posterId: result.insertedId.toString(),
          ...doc,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("posters/save POST error:", error);
    return NextResponse.json({ ok: false, error: "Failed to save poster" }, { status: 500 });
  }
}
