import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
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
    { $unwind: "$_user" },
    {
      $lookup: {
        from: "projects",
        localField: "project_id",
        foreignField: "_id",
        as: "_project",
      },
    },
    { $unwind: "$_project" },
    {
      $lookup: {
        from: "companies",
        localField: "_project.company_id",
        foreignField: "_id",
        as: "_company",
      },
    },
    { $unwind: "$_company" },
    {
      $project: {
        id: { $toString: "$_id" },
        date: 1,
        man_day: 1,
        note: 1,
        user_id: { $toString: "$user_id" },
        project_id: { $toString: "$project_id" },
        worker_name: "$_user.display_name",
        project_name: "$_project.name",
        work_type: "$_project.work_type",
        company_id: { $toString: "$_company._id" },
        company_name: "$_company.name",
        company_color: "$_company.color",
      },
    },
    { $sort: { date: 1, company_name: 1, work_type: 1, project_name: 1, worker_name: 1 } },
  ]).toArray();

  return NextResponse.json(data);
}
