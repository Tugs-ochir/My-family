import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is not set in environment');
}

// Reuse the client across hot reloads in Next.js (app router).
const globalForMongo = global as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

export const clientPromise = globalForMongo._mongoClientPromise
  ? globalForMongo._mongoClientPromise
  : (globalForMongo._mongoClientPromise = MongoClient.connect(uri));

export async function getDb(dbName = 'family_finance') {
  const client = await clientPromise;
  return client.db(dbName);
}
