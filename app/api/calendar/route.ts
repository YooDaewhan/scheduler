import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear();
    const month = searchParams.get("month") || new Date().getMonth() + 1;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const db = await getDb();

    const data = await db.collection("daily_assignments").aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "_user",
        },
      },
      { $unwind: { path: "$_user", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "projects",
          localField: "project_id",
          foreignField: "_id",
          as: "_project",
        },
      },
      { $unwind: { path: "$_project", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "companies",
          localField: "_project.company_id",
          foreignField: "_id",
          as: "_company",
        },
      },
      { $unwind: { path: "$_company", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: { $toString: "$_id" },
          date: 1,
          man_day: 1,
          note: 1,
          user_id: { $toString: "$user_id" },
          project_id: { $toString: "$project_id" },
          worker_name: { $ifNull: ["$_user.display_name", "알 수 없음"] },
          project_name: { $ifNull: ["$_project.name", "알 수 없음"] },
          work_type: { $ifNull: ["$_project.work_type", "contract"] },
          company_id: { $toString: { $ifNull: ["$_company._id", "$_id"] } },
          company_name: { $ifNull: ["$_company.name", "알 수 없음"] },
          company_color: { $ifNull: ["$_company.color", "#94a3b8"] },
        },
      },
      { $sort: { date: 1, company_name: 1, work_type: 1, project_name: 1, worker_name: 1 } },
    ]).toArray();

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[/api/calendar] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
