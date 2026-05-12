import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getDb from "@/lib/db";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { man_day, note, project_id, user_id } = await _req.json();
  const db = await getDb();
  await db.collection("daily_assignments").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        man_day,
        note: note || null,
        project_id: new ObjectId(project_id),
        user_id: new ObjectId(user_id),
      },
    }
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  await db.collection("daily_assignments").deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}
