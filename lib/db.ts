import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "scheduler.db");

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      work_type TEXT NOT NULL DEFAULT 'contract',
      start_date DATE,
      end_date DATE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      date DATE NOT NULL,
      man_day REAL DEFAULT 1.0,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, project_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assignments_date ON daily_assignments(date);
    CREATE INDEX IF NOT EXISTS idx_assignments_user_date ON daily_assignments(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_assignments_project_date ON daily_assignments(project_id, date);
  `);

  // Migration: add work_type if not exists
  const cols = database.prepare("PRAGMA table_info(projects)").all() as any[];
  if (!cols.find((c: any) => c.name === "work_type")) {
    database.exec("ALTER TABLE projects ADD COLUMN work_type TEXT NOT NULL DEFAULT 'contract'");
  }

  // Seed admin
  const bcryptjs = require("bcryptjs");
  const existing = database.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  if (!existing) {
    const hash = bcryptjs.hashSync("admin123", 10);
    database.prepare("INSERT INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)").run("admin", hash, "admin", "관리자");
  }
}

export default getDb;
