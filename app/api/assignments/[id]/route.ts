import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { man_day, note, project_id, user_id } = await req.json();
  const db = getDb();
  db.prepare(
    "UPDATE daily_assignments SET man_day = ?, note = ?, project_id = ?, user_id = ? WHERE id = ?"
  ).run(man_day, note || null, project_id, user_id, id);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM daily_assignments WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
