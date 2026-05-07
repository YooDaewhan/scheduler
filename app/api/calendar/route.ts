import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") || new Date().getFullYear();
  const month = searchParams.get("month") || new Date().getMonth() + 1;

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const db = getDb();
  const data = db
    .prepare(
      `SELECT
        da.id, da.date, da.man_day, da.note, da.user_id, da.project_id,
        u.display_name as worker_name,
        p.name as project_name,
        c.id as company_id, c.name as company_name, c.color as company_color
       FROM daily_assignments da
       JOIN users u ON da.user_id = u.id
       JOIN projects p ON da.project_id = p.id
       JOIN companies c ON p.company_id = c.id
       WHERE da.date BETWEEN ? AND ?
       ORDER BY da.date, c.name, p.name, u.display_name`
    )
    .all(startDate, endDate);

  return NextResponse.json(data);
}
