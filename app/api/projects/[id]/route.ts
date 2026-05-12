import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getDb from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, work_type, start_date, end_date, is_active } = await req.json();
  const db = await getDb();
  await db.collection("projects").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        name,
        work_type: work_type || "contract",
        start_date: start_date || null,
        end_date: end_date || null,
        is_active: !!is_active,
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
  const oid = new ObjectId(id);
  await db.collection("daily_assignments").deleteMany({ project_id: oid });
  await db.collection("projects").deleteOne({ _id: oid });
  return NextResponse.json({ success: true });
}
