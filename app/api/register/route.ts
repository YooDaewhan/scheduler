import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import bcryptjs from "bcryptjs";

export async function POST(req: NextRequest) {
  const { name, password, isAdmin, adminCode } = await req.json();

  if (!name?.trim() || !password) {
    return NextResponse.json({ error: "이름과 비밀번호를 입력하세요" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(name.trim());
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 이름입니다" }, { status: 400 });
  }

  let role = "member";
  if (isAdmin) {
    // 관리자 인증코드 확인
    if (adminCode !== "admin2026") {
      return NextResponse.json({ error: "관리자 인증코드가 올바르지 않습니다" }, { status: 400 });
    }
    role = "admin";
  }

  const hash = bcryptjs.hashSync(password, 10);
  const result = db
    .prepare("INSERT INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)")
    .run(name.trim(), hash, role, name.trim());

  return NextResponse.json({ id: result.lastInsertRowid, role });
}
