import { MongoClient, Db } from "mongodb";
import bcryptjs from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI!;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

let seeded = false;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db("scheduler");
  if (!seeded) {
    seeded = true;
    await seedDb(db);
  }
  return db;
}

async function seedDb(db: Db) {
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("daily_assignments").createIndex({ date: 1 });
  await db.collection("daily_assignments").createIndex({ user_id: 1, date: 1 });
  await db.collection("daily_assignments").createIndex({ project_id: 1, date: 1 });
  await db.collection("daily_assignments").createIndex(
    { user_id: 1, project_id: 1, date: 1 },
    { unique: true }
  );

  const existing = await db.collection("users").findOne({ username: "admin" });
  if (!existing) {
    const hash = bcryptjs.hashSync("admin123", 10);
    await db.collection("users").insertOne({
      username: "admin",
      password: hash,
      role: "admin",
      display_name: "관리자",
      created_at: new Date(),
    });
  }
}

export default getDb;
