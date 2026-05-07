import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM daily_assignments WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
