import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | null = null;

/** Connect once per process and reuse the client; the driver pools connections. */
export async function connectMongo(url: string): Promise<Db> {
  if (!client) {
    client = new MongoClient(url);
    await client.connect();
  }
  // The database name comes from the URL path (e.g. /pulseboard).
  return client.db();
}

export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
}
