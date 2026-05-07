import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import bcryptjs from "bcryptjs";

export async function GET() {
  const db = getDb();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const members = db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.role, u.created_at,
        (SELECT COALESCE(SUM(da.man_day), 0) FROM daily_assignments da
         WHERE da.user_id = u.id AND strftime('%Y-%m', da.date) = ?) as month_total
       FROM users u ORDER BY u.id`
    )
    .all(yearMonth);
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const { username, password, display_name, role } = await req.json();
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "필수 항목을 입력하세요" }, { status: 400 });
  }
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 아이디입니다" }, { status: 400 });
  }

  const hash = bcryptjs.hashSync(password, 10);
  const result = db
    .prepare(
      "INSERT INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)"
    )
    .run(username.trim(), hash, role || "member", display_name?.trim() || username.trim());
  return NextResponse.json({ id: result.lastInsertRowid });
}
