import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getNextColor } from "@/lib/colors";

export async function GET() {
  const db = getDb();
  const companies = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM projects WHERE company_id = c.id AND is_active = 1) as project_count,
        (SELECT COUNT(DISTINCT da.user_id) FROM daily_assignments da
         JOIN projects p ON da.project_id = p.id
         WHERE p.company_id = c.id AND da.date = date('now')) as today_workers
       FROM companies c ORDER BY c.name`
    )
    .all();
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "업체명을 입력하세요" }, { status: 400 });
  }
  const db = getDb();
  const usedColors = (
    db.prepare("SELECT color FROM companies").all() as any[]
  ).map((r) => r.color);
  const color = getNextColor(usedColors);

  const result = db
    .prepare("INSERT INTO companies (name, color) VALUES (?, ?)")
    .run(name.trim(), color);
  return NextResponse.json({ id: result.lastInsertRowid, name: name.trim(), color });
}
