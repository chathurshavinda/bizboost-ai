import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firebase_uid = searchParams.get("firebase_uid")?.trim() ?? "";
    const draftId = searchParams.get("draftId")?.trim() ?? "";

    if (!firebase_uid) {
      return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
    }

    const db = await getDb();

    let query: Record<string, unknown> = { firebase_uid };
    if (draftId && ObjectId.isValid(draftId)) {
      query = { _id: new ObjectId(draftId), firebase_uid };
    }

    const latestDraft = await db.collection("caption_drafts").findOne(query, { sort: { createdAt: -1 } });

    if (!latestDraft) {
      return NextResponse.json({ ok: false, error: "no_draft_found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          ...latestDraft,
          hashtags: Array.isArray(latestDraft.hashtags) ? latestDraft.hashtags : [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("caption draft GET error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load draft" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const firebase_uid = typeof body?.firebase_uid === "string" ? body.firebase_uid.trim() : "";

    if (!firebase_uid) {
      return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
    }

    const dayNumber = Number(body?.dayNumber ?? 0);
    const caption = String(body?.caption ?? "");
    const imageName = String(body?.imageName ?? "");
    const hashtags = Array.isArray(body?.hashtags) ? body.hashtags : [];
    const posterStyleRaw = typeof body?.posterStyle === "string" ? body.posterStyle.trim() : "";
    const allowedPosterStyles = [
      "bold-statement",
      "landscape-action",
      "hero-product",
      "editorial",
      "minimal-clean",
      "luxury-dark",
      "neon-tech",
      "festival-vibrant",
    ] as const;
    const posterStyle = (allowedPosterStyles as readonly string[]).includes(posterStyleRaw)
      ? (posterStyleRaw as (typeof allowedPosterStyles)[number])
      : null;
    const posterDesign =
      body?.posterDesign && typeof body.posterDesign === "object" ? body.posterDesign : null;

    const doc = {
      firebase_uid,
      dayNumber: Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : null,
      caption,
      hashtags,
      imageName,
      offerText: String(body?.offerText ?? ""),
      imageDataUrl: String(body?.imageDataUrl ?? ""),
      posterStyle,
      posterDesign,
      createdAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection("caption_drafts").insertOne(doc);

    return NextResponse.json(
      {
        ok: true,
        data: {
          draftId: result.insertedId.toString(),
          ...doc,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("caption draft POST error:", error);
    return NextResponse.json({ ok: false, error: "Failed to save draft" }, { status: 500 });
  }
}
