import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getDb from "@/lib/db";

export async function POST(req: NextRequest) {
  const { assignments } = await req.json();
  if (!assignments?.length) {
    return NextResponse.json({ error: "배치 데이터가 없습니다" }, { status: 400 });
  }

  const db = await getDb();
  const col = db.collection("daily_assignments");

  try {
    for (const item of assignments) {
      await col.updateOne(
        {
          user_id: new ObjectId(item.user_id),
          project_id: new ObjectId(item.project_id),
          date: item.date,
        },
        {
          $set: { man_day: item.man_day || 1.0, note: item.note || null },
          $setOnInsert: { created_at: new Date() },
        },
        { upsert: true }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
