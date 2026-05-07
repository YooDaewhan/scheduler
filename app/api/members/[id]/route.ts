import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import bcryptjs from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { username, password, display_name, role } = await req.json();
  const db = getDb();

  if (password) {
    const hash = bcryptjs.hashSync(password, 10);
    db.prepare(
      "UPDATE users SET username = ?, password = ?, display_name = ?, role = ? WHERE id = ?"
    ).run(username, hash, display_name, role, id);
  } else {
    db.prepare(
      "UPDATE users SET username = ?, display_name = ?, role = ? WHERE id = ?"
    ).run(username, display_name, role, id);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
