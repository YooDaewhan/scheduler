import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = await getDb();

  const projects = await db.collection("projects").aggregate([
    { $match: { is_active: true } },
    {
      $lookup: {
        from: "companies",
        localField: "company_id",
        foreignField: "_id",
        as: "_company",
      },
    },
    { $unwind: "$_company" },
    {
      $project: {
        id: { $toString: "$_id" },
        name: 1,
        work_type: 1,
        company_id: { $toString: "$company_id" },
        company_name: "$_company.name",
        company_color: "$_company.color",
      },
    },
    { $sort: { company_name: 1, work_type: 1, name: 1 } },
  ]).toArray();

  return NextResponse.json(projects);
}
