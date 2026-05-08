import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") || new Date().getFullYear();
  const month = searchParams.get("month") || new Date().getMonth() + 1;
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  const db = getDb();

  // 개인별 일자별
  const personData = db
    .prepare(
      `SELECT u.id as user_id, u.display_name, da.date, da.man_day
       FROM daily_assignments da
       JOIN users u ON da.user_id = u.id
       WHERE strftime('%Y-%m', da.date) = ?
       ORDER BY u.display_name, da.date`
    )
    .all(yearMonth);

  // 개인별 총 공수 + 출근일수
  const personTotals = db
    .prepare(
      `SELECT u.id as user_id, u.display_name,
        SUM(da.man_day) as total_man_days,
        COUNT(DISTINCT da.date) as work_days
       FROM daily_assignments da
       JOIN users u ON da.user_id = u.id
       WHERE strftime('%Y-%m', da.date) = ?
       GROUP BY u.id
       ORDER BY u.display_name`
    )
    .all(yearMonth);

  // 업체별 현장별 공수
  const projectData = db
    .prepare(
      `SELECT p.name as project_name, c.name as company_name, c.color as company_color,
        SUM(da.man_day) as total_man_days
       FROM daily_assignments da
       JOIN projects p ON da.project_id = p.id
       JOIN companies c ON p.company_id = c.id
       WHERE strftime('%Y-%m', da.date) = ?
       GROUP BY p.id
       ORDER BY c.name, p.name`
    )
    .all(yearMonth);

  // 업체별 총 합계
  const companyTotals = db
    .prepare(
      `SELECT c.name as company_name, c.color as company_color,
        SUM(da.man_day) as total_man_days
       FROM daily_assignments da
       JOIN projects p ON da.project_id = p.id
       JOIN companies c ON p.company_id = c.id
       WHERE strftime('%Y-%m', da.date) = ?
       GROUP BY c.id
       ORDER BY c.name`
    )
    .all(yearMonth);

  // 공사별 통합 (업체 무관)
  const projectMerged = db
    .prepare(
      `SELECT p.name as project_name, SUM(da.man_day) as total_man_days
       FROM daily_assignments da
       JOIN projects p ON da.project_id = p.id
       WHERE strftime('%Y-%m', da.date) = ?
       GROUP BY p.name
       ORDER BY p.name`
    )
    .all(yearMonth);

  return NextResponse.json({ personData, personTotals, projectData, companyTotals, projectMerged });
}
