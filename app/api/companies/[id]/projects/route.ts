import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const projects = db
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(DISTINCT da.user_id) FROM daily_assignments da
         WHERE da.project_id = p.id AND da.date = date('now')) as today_workers
       FROM projects p WHERE p.company_id = ? ORDER BY p.is_active DESC, p.work_type, p.name`
    )
    .all(id);
  return NextResponse.json(projects);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, work_type, start_date, end_date } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "공사명을 입력하세요" }, { status: 400 });
  }
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO projects (company_id, name, work_type, start_date, end_date) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, name.trim(), work_type || "contract", start_date || null, end_date || null);
  return NextResponse.json({ id: result.lastInsertRowid });
}
