import { MongoClient, Db } from "mongodb";
import bcryptjs from "bcryptjs";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let _clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (_clientPromise) return _clientPromise;

  const uri = process.env.MONGODB_URI!;
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    _clientPromise = global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri);
    _clientPromise = client.connect();
  }
  return _clientPromise;
}

let seeded = false;

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
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
