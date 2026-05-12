import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import getDb from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const members = await db.collection("users").aggregate([
    {
      $lookup: {
        from: "daily_assignments",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user_id", "$$uid"] },
                  { $regexMatch: { input: "$date", regex: `^${yearMonth}` } },
                ],
              },
            },
          },
          { $group: { _id: null, total: { $sum: "$man_day" } } },
        ],
        as: "_totals",
      },
    },
    {
      $project: {
        id: { $toString: "$_id" },
        username: 1,
        display_name: 1,
        role: 1,
        created_at: 1,
        month_total: { $ifNull: [{ $arrayElemAt: ["$_totals.total", 0] }, 0] },
      },
    },
    { $sort: { _id: 1 } },
  ]).toArray();

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const { username, password, display_name, role } = await req.json();
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "필수 항목을 입력하세요" }, { status: 400 });
  }
  const db = await getDb();
  const existing = await db.collection("users").findOne({ username: username.trim() });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 아이디입니다" }, { status: 400 });
  }

  const hash = bcryptjs.hashSync(password, 10);
  const result = await db.collection("users").insertOne({
    username: username.trim(),
    password: hash,
    role: role || "member",
    display_name: display_name?.trim() || username.trim(),
    created_at: new Date(),
  });
  return NextResponse.json({ id: result.insertedId.toString() });
}
