import type { AnyBulkWriteOperation, Collection, Document, Filter, UpdateFilter } from 'mongodb';

/**
 * One upsert per doc, matched on its natural key: an existing row is
 * overwritten and a missing one inserted, so writing the same docs twice
 * leaves the collection unchanged.
 */
export function upsertOps<T extends Document>(
  docs: readonly T[],
  keyFields: readonly (keyof T & string)[],
): AnyBulkWriteOperation<T>[] {
  return docs.map((doc) => ({
    updateOne: {
      filter: Object.fromEntries(keyFields.map((k) => [k, doc[k]])) as Filter<T>,
      update: { $set: doc } as UpdateFilter<T>,
      upsert: true,
    },
  }));
}

/**
 * Idempotent bulk write of raw data; ingest writes go through here, never
 * insertOne. Unordered, so one bad row doesn't stop the rest of the batch.
 * Returns how many docs were written.
 */
export async function upsertMany<T extends Document>(
  collection: Collection<T>,
  docs: readonly T[],
  keyFields: readonly (keyof T & string)[],
): Promise<number> {
  if (docs.length === 0) return 0;
  await collection.bulkWrite(upsertOps(docs, keyFields), { ordered: false });
  return docs.length;
}
