import { MongoClient } from 'mongodb';

// Keep the client cached between hot reloads/server invocations.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
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
