import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") || new Date().getFullYear();
  const month = searchParams.get("month") || new Date().getMonth() + 1;
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  const db = getDb();

  // Per-person daily breakdown
  const personData = db
    .prepare(
      `SELECT
        u.id as user_id, u.display_name,
        da.date, da.man_day
       FROM daily_assignments da
       JOIN users u ON da.user_id = u.id
       WHERE strftime('%Y-%m', da.date) = ?
       ORDER BY u.display_name, da.date`
    )
    .all(yearMonth);

  // Per-project summary
  const projectData = db
    .prepare(
      `SELECT
        p.name as project_name,
        c.name as company_name,
        c.color as company_color,
        SUM(da.man_day) as total_man_days
       FROM daily_assignments da
       JOIN projects p ON da.project_id = p.id
       JOIN companies c ON p.company_id = c.id
       WHERE strftime('%Y-%m', da.date) = ?
       GROUP BY p.id
       ORDER BY c.name, p.name`
    )
    .all(yearMonth);

  return NextResponse.json({ personData, projectData });
}
