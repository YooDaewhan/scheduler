import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getDb from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const company = await db.collection("companies").findOne({ _id: new ObjectId(id) });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...company, id: company._id.toString() });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, color } = await req.json();
  const db = await getDb();
  await db.collection("companies").updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, color } }
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

  // cascade: delete projects and their assignments
  const projects = await db.collection("projects").find({ company_id: oid }, { projection: { _id: 1 } }).toArray();
  const projectIds = projects.map((p) => p._id);
  if (projectIds.length > 0) {
    await db.collection("daily_assignments").deleteMany({ project_id: { $in: projectIds } });
  }
  await db.collection("projects").deleteMany({ company_id: oid });
  await db.collection("companies").deleteOne({ _id: oid });

  return NextResponse.json({ success: true });
}
