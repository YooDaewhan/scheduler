import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") || new Date().getFullYear();
  const month = searchParams.get("month") || new Date().getMonth() + 1;

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  const db = await getDb();
  const userOid = new ObjectId(userId);

  const data = await db.collection("daily_assignments").aggregate([
    { $match: { user_id: userOid, date: { $gte: startDate, $lte: endDate } } },
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
        project_name: "$_project.name",
        company_name: "$_company.name",
        company_color: "$_company.color",
      },
    },
    { $sort: { date: 1, company_name: 1, project_name: 1 } },
  ]).toArray();

  const totalRow = await db.collection("daily_assignments").aggregate([
    {
      $match: {
        user_id: userOid,
        date: { $regex: `^${yearMonth}` },
      },
    },
    { $group: { _id: null, total: { $sum: "$man_day" } } },
  ]).toArray();

  return NextResponse.json({ assignments: data, monthTotal: totalRow[0]?.total ?? 0 });
}
