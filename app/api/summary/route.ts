import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear();
    const month = searchParams.get("month") || new Date().getMonth() + 1;
    const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
    const dateFilter = { date: { $regex: `^${yearMonth}` } };

    const db = await getDb();

    const [personData, personTotalsRaw, projectData, companyTotals, projectMerged] = await Promise.all([
      // personData
      db.collection("daily_assignments").aggregate([
        { $match: dateFilter },
        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "_user" } },
        { $unwind: { path: "$_user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            user_id: { $toString: "$user_id" },
            display_name: { $ifNull: ["$_user.display_name", "알 수 없음"] },
            date: 1,
            man_day: 1,
          },
        },
        { $sort: { display_name: 1, date: 1 } },
      ]).toArray(),

      // personTotals
      db.collection("daily_assignments").aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$user_id",
            total_man_days: { $sum: "$man_day" },
            dates: { $addToSet: "$date" },
          },
        },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "_user" } },
        { $unwind: { path: "$_user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            user_id: { $toString: "$_id" },
            display_name: { $ifNull: ["$_user.display_name", "알 수 없음"] },
            total_man_days: 1,
            work_days: { $size: "$dates" },
          },
        },
        { $sort: { display_name: 1 } },
      ]).toArray(),

      // projectData — project_id가 유효한 것만 포함
      db.collection("daily_assignments").aggregate([
        { $match: dateFilter },
        { $lookup: { from: "projects", localField: "project_id", foreignField: "_id", as: "_project" } },
        { $unwind: "$_project" },
        { $lookup: { from: "companies", localField: "_project.company_id", foreignField: "_id", as: "_company" } },
        { $unwind: { path: "$_company", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$project_id",
            project_name: { $first: "$_project.name" },
            work_type: { $first: { $ifNull: ["$_project.work_type", "contract"] } },
            company_name: { $first: { $ifNull: ["$_company.name", "알 수 없음"] } },
            company_color: { $first: { $ifNull: ["$_company.color", "#94a3b8"] } },
            total_man_days: { $sum: "$man_day" },
          },
        },
        { $sort: { company_name: 1, work_type: 1, project_name: 1 } },
      ]).toArray(),

      // companyTotals — project_id가 유효한 것만 포함
      db.collection("daily_assignments").aggregate([
        { $match: dateFilter },
        { $lookup: { from: "projects", localField: "project_id", foreignField: "_id", as: "_project" } },
        { $unwind: "$_project" },
        { $lookup: { from: "companies", localField: "_project.company_id", foreignField: "_id", as: "_company" } },
        { $unwind: { path: "$_company", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ["$_company._id", "$_project._id"] },
            company_name: { $first: { $ifNull: ["$_company.name", "알 수 없음"] } },
            company_color: { $first: { $ifNull: ["$_company.color", "#94a3b8"] } },
            total_man_days: { $sum: "$man_day" },
          },
        },
        { $sort: { company_name: 1 } },
      ]).toArray(),

      // projectMerged — project_id가 유효한 것만 포함
      db.collection("daily_assignments").aggregate([
        { $match: dateFilter },
        { $lookup: { from: "projects", localField: "project_id", foreignField: "_id", as: "_project" } },
        { $unwind: "$_project" },
        {
          $group: {
            _id: "$_project.name",
            project_name: { $first: "$_project.name" },
            total_man_days: { $sum: "$man_day" },
          },
        },
        { $sort: { project_name: 1 } },
      ]).toArray(),
    ]);

    return NextResponse.json({ personData, personTotals: personTotalsRaw, projectData, companyTotals, projectMerged });
  } catch (err: any) {
    console.error("[/api/summary] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
