import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getNextColor } from "@/lib/colors";

export async function GET() {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);

  const companies = await db.collection("companies").aggregate([
    {
      $lookup: {
        from: "projects",
        let: { cid: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$company_id", "$$cid"] }, { $eq: ["$is_active", true] }] } } },
          { $count: "n" },
        ],
        as: "_projects",
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "_id",
        foreignField: "company_id",
        as: "_all_projects",
      },
    },
    {
      $lookup: {
        from: "daily_assignments",
        let: { pids: "$_all_projects._id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $in: ["$project_id", "$$pids"] }, { $eq: ["$date", today] }] } } },
          { $group: { _id: "$user_id" } },
          { $count: "n" },
        ],
        as: "_today_workers",
      },
    },
    {
      $project: {
        id: { $toString: "$_id" },
        name: 1,
        color: 1,
        created_at: 1,
        project_count: { $ifNull: [{ $arrayElemAt: ["$_projects.n", 0] }, 0] },
        today_workers: { $ifNull: [{ $arrayElemAt: ["$_today_workers.n", 0] }, 0] },
      },
    },
    { $sort: { name: 1 } },
  ]).toArray();

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "업체명을 입력하세요" }, { status: 400 });
  }
  const db = await getDb();
  const usedColors = (await db.collection("companies").find({}, { projection: { color: 1 } }).toArray()).map((r) => r.color);
  const color = getNextColor(usedColors);

  const result = await db.collection("companies").insertOne({ name: name.trim(), color, created_at: new Date() });
  return NextResponse.json({ id: result.insertedId.toString(), name: name.trim(), color });
}
