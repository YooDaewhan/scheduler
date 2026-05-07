import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(id);
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, color } = await req.json();
  const db = getDb();
  db.prepare("UPDATE companies SET name = ?, color = ? WHERE id = ?").run(
    name,
    color,
    id
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM companies WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
