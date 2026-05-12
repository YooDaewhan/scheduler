import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcryptjs from "bcryptjs";
import getDb from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { username, password, display_name, role } = await req.json();
  const db = await getDb();

  if (password) {
    const hash = bcryptjs.hashSync(password, 10);
    await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: { username, password: hash, display_name, role } }
    );
  } else {
    await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: { username, display_name, role } }
    );
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const oid = new ObjectId(id);
  await db.collection("daily_assignments").deleteMany({ user_id: oid });
  await db.collection("users").deleteOne({ _id: oid });
  return NextResponse.json({ success: true });
}
