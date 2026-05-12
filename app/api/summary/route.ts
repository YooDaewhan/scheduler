import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
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
      { $unwind: "$_user" },
      {
        $project: {
          user_id: { $toString: "$user_id" },
          display_name: "$_user.display_name",
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
      { $unwind: "$_user" },
      {
        $project: {
          user_id: { $toString: "$_id" },
          display_name: "$_user.display_name",
          total_man_days: 1,
          work_days: { $size: "$dates" },
        },
      },
      { $sort: { display_name: 1 } },
    ]).toArray(),

    // projectData
    db.collection("daily_assignments").aggregate([
      { $match: dateFilter },
      { $lookup: { from: "projects", localField: "project_id", foreignField: "_id", as: "_project" } },
      { $unwind: "$_project" },
      { $lookup: { from: "companies", localField: "_project.company_id", foreignField: "_id", as: "_company" } },
      { $unwind: "$_company" },
      {
        $group: {
          _id: "$project_id",
          project_name: { $first: "$_project.name" },
          work_type: { $first: "$_project.work_type" },
          company_name: { $first: "$_company.name" },
          company_color: { $first: "$_company.color" },
          total_man_days: { $sum: "$man_day" },
        },
      },
      { $sort: { company_name: 1, work_type: 1, project_name: 1 } },
    ]).toArray(),

    // companyTotals
    db.collection("daily_assignments").aggregate([
      { $match: dateFilter },
      { $lookup: { from: "projects", localField: "project_id", foreignField: "_id", as: "_project" } },
      { $unwind: "$_project" },
      { $lookup: { from: "companies", localField: "_project.company_id", foreignField: "_id", as: "_company" } },
      { $unwind: "$_company" },
      {
        $group: {
          _id: "$_company._id",
          company_name: { $first: "$_company.name" },
          company_color: { $first: "$_company.color" },
          total_man_days: { $sum: "$man_day" },
        },
      },
      { $sort: { company_name: 1 } },
    ]).toArray(),

    // projectMerged
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
}
