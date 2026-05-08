import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, work_type, start_date, end_date, is_active } = await req.json();
  const db = getDb();
  db.prepare(
    "UPDATE projects SET name = ?, work_type = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?"
  ).run(name, work_type || "contract", start_date || null, end_date || null, is_active ? 1 : 0, id);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
