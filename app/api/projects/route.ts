import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = getDb();
  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.work_type, p.company_id, c.name as company_name, c.color as company_color
       FROM projects p
       JOIN companies c ON p.company_id = c.id
       WHERE p.is_active = 1
       ORDER BY c.name, p.work_type, p.name`
    )
    .all();
  return NextResponse.json(projects);
}
