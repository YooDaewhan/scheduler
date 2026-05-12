import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import getDb from "@/lib/db";

export async function POST(req: NextRequest) {
  const { name, password, isAdmin, adminCode } = await req.json();

  if (!name?.trim() || !password) {
    return NextResponse.json({ error: "이름과 비밀번호를 입력하세요" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.collection("users").findOne({ username: name.trim() });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 이름입니다" }, { status: 400 });
  }

  let role = "member";
  if (isAdmin) {
    if (adminCode !== "admin2026") {
      return NextResponse.json({ error: "관리자 인증코드가 올바르지 않습니다" }, { status: 400 });
    }
    role = "admin";
  }

  const hash = bcryptjs.hashSync(password, 10);
  const result = await db.collection("users").insertOne({
    username: name.trim(),
    password: hash,
    role,
    display_name: name.trim(),
    created_at: new Date(),
  });

  return NextResponse.json({ id: result.insertedId.toString(), role });
}
