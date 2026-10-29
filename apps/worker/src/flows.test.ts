import { describe, expect, it } from 'vitest';
import { QUEUES, SOURCES } from '@pulseboard/shared';
import { dateFlow } from './flows.ts';

describe('dateFlow', () => {
  const flow = dateFlow('2026-10-29', '42');

  it('makes the aggregate the parent of one ingest job per source', () => {
    expect(flow.queueName).toBe(QUEUES.aggregate);
    expect(flow.data).toEqual({ date: '2026-10-29', runId: '42' });
    expect(flow.children?.map((c) => c.data)).toEqual(
      SOURCES.map((source) => ({ source, date: '2026-10-29' })),
    );
    expect(flow.children?.every((c) => c.queueName === QUEUES.ingest)).toBe(true);
  });

  it('lets the aggregate run even when a source fails after its retries', () => {
    for (const child of flow.children ?? []) {
      expect(child.opts).toMatchObject({ attempts: 3, ignoreDependencyOnFailure: true });
    }
  });

  it('gives every job an id that is unique per run and valid for BullMQ', () => {
    const ids = [flow, ...(flow.children ?? [])].map((j) => j.opts?.jobId);
    expect(new Set(ids).size).toBe(SOURCES.length + 1);
    for (const id of ids) expect(id).not.toContain(':');
    expect(dateFlow('2026-10-29', '43').opts?.jobId).not.toBe(flow.opts?.jobId);
  });
});
