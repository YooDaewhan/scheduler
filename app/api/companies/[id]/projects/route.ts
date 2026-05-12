import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getDb from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const companyOid = new ObjectId(id);

  const projects = await db.collection("projects").aggregate([
    { $match: { company_id: companyOid } },
    {
      $lookup: {
        from: "daily_assignments",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$project_id", "$$pid"] }, { $eq: ["$date", today] }] } } },
          { $group: { _id: "$user_id" } },
          { $count: "n" },
        ],
        as: "_today_workers",
      },
    },
    {
      $project: {
        id: { $toString: "$_id" },
        company_id: { $toString: "$company_id" },
        name: 1,
        work_type: 1,
        start_date: 1,
        end_date: 1,
        is_active: 1,
        created_at: 1,
        today_workers: { $ifNull: [{ $arrayElemAt: ["$_today_workers.n", 0] }, 0] },
      },
    },
    { $sort: { is_active: -1, work_type: 1, name: 1 } },
  ]).toArray();

  return NextResponse.json(projects);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, work_type, start_date, end_date } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "공사명을 입력하세요" }, { status: 400 });
  }
  const db = await getDb();
  const result = await db.collection("projects").insertOne({
    company_id: new ObjectId(id),
    name: name.trim(),
    work_type: work_type || "contract",
    start_date: start_date || null,
    end_date: end_date || null,
    is_active: true,
    created_at: new Date(),
  });
  return NextResponse.json({ id: result.insertedId.toString() });
}
