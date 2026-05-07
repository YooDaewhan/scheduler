import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function POST(req: NextRequest) {
  const { assignments } = await req.json();
  // assignments: [{ user_id, project_id, date, man_day, note }]
  if (!assignments?.length) {
    return NextResponse.json({ error: "배치 데이터가 없습니다" }, { status: 400 });
  }

  const db = getDb();
  const insert = db.prepare(
    `INSERT OR REPLACE INTO daily_assignments (user_id, project_id, date, man_day, note)
     VALUES (?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction((items: any[]) => {
    for (const item of items) {
      insert.run(
        item.user_id,
        item.project_id,
        item.date,
        item.man_day || 1.0,
        item.note || null
      );
    }
  });

  try {
    insertMany(assignments);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
