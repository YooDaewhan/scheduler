import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") || new Date().getFullYear();
  const month = searchParams.get("month") || new Date().getMonth() + 1;

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const db = getDb();
  const data = db
    .prepare(
      `SELECT
        da.id, da.date, da.man_day, da.note,
        p.name as project_name,
        c.name as company_name, c.color as company_color
       FROM daily_assignments da
       JOIN projects p ON da.project_id = p.id
       JOIN companies c ON p.company_id = c.id
       WHERE da.user_id = ? AND da.date BETWEEN ? AND ?
       ORDER BY da.date, c.name, p.name`
    )
    .all(userId, startDate, endDate);

  // 이번달 총 공수
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const totalRow = db
    .prepare(
      `SELECT COALESCE(SUM(man_day), 0) as total
       FROM daily_assignments
       WHERE user_id = ? AND strftime('%Y-%m', date) = ?`
    )
    .get(userId, yearMonth) as any;

  return NextResponse.json({ assignments: data, monthTotal: totalRow.total });
}
