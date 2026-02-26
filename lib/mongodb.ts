import { MongoClient } from 'mongodb';

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoIndexesReady?: boolean;
};

let cachedClientPromise = globalForMongo._mongoClientPromise;

function getClientPromise() {
  if (!cachedClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not set in environment');
    }
    cachedClientPromise = MongoClient.connect(uri);
    globalForMongo._mongoClientPromise = cachedClientPromise;
  }
  return cachedClientPromise;
}

export async function getDb(dbName = 'family_finance') {
  const client = await getClientPromise();
  return client.db(dbName);
}

export async function ensureIndexes() {
  if (globalForMongo._mongoIndexesReady) return;

  const db = await getDb();

  try {
    // Users: unique email index (default name 'email_1' matches existing index)
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
  } catch {
    // Already exists — safe to ignore
  }

  // Finance: drop legacy single-month index if it exists, then create per-user index
  const financeCol = db.collection('finance_months');
  try {
    await financeCol.dropIndex('month_1');
  } catch {
    // Index doesn't exist — safe to ignore
  }
  try {
    await financeCol.createIndex(
      { userId: 1, month: 1 },
      {
        unique: true,
        name: 'userId_month_unique',
        partialFilterExpression: { userId: { $exists: true, $type: 'string' } },
      },
    );
  } catch {
    // Already exists — safe to ignore
  }

  globalForMongo._mongoIndexesReady = true;
}
