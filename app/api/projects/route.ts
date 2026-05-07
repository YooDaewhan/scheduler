import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

// GET all projects grouped by company (for dropdowns)
export async function GET() {
  const db = getDb();
  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.company_id, c.name as company_name, c.color as company_color
       FROM projects p
       JOIN companies c ON p.company_id = c.id
       WHERE p.is_active = 1
       ORDER BY c.name, p.name`
    )
    .all();
  return NextResponse.json(projects);
}
