import { proxyFetch } from './proxyNetwork';

const OSV_QUERY_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const OSV_QUERY_URL = 'https://api.osv.dev/v1/query';
const OSV_BATCH_CHUNK_SIZE = 1000;

export type OsvEcosystem = 'npm' | 'PyPI';

export interface OsvPackageVersion {
  lookupKey: string;
  queryName: string;
  version: string;
}

interface OsvQueryBatchVulnRef {
  id?: string;
}

interface OsvQueryBatchResult {
  vulns?: OsvQueryBatchVulnRef[];
  next_page_token?: string;
}

interface OsvQueryBatchResponse {
  results?: OsvQueryBatchResult[];
}

const countVulnsInResult = async (
  entry: OsvPackageVersion,
  ecosystem: OsvEcosystem,
  initial: OsvQueryBatchResult,
): Promise<number> => {
  let total = initial.vulns?.length ?? 0;
  let pageToken = initial.next_page_token;

  while (pageToken) {
    const response = await proxyFetch(OSV_QUERY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package: { name: entry.queryName, ecosystem },
        version: entry.version,
        page_token: pageToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`OSV API returned HTTP ${response.status}.`);
    }

    const data = (await response.json()) as { vulns?: OsvQueryBatchVulnRef[]; next_page_token?: string };
    total += data.vulns?.length ?? 0;
    pageToken = data.next_page_token;
  }

  return total;
};

const queryOsvBatchChunk = async (
  entries: OsvPackageVersion[],
  ecosystem: OsvEcosystem,
): Promise<Map<string, number>> => {
  const response = await proxyFetch(OSV_QUERY_BATCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queries: entries.map((entry) => ({
        package: { name: entry.queryName, ecosystem },
        version: entry.version,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`OSV API returned HTTP ${response.status}.`);
  }

  const data = (await response.json()) as OsvQueryBatchResponse;
  const results = data.results ?? [];
  const counts = new Map<string, number>();

  await Promise.all(
    entries.map(async (entry, index) => {
      const result = results[index] ?? {};
      const count = await countVulnsInResult(entry, ecosystem, result);
      counts.set(entry.lookupKey, count);
    }),
  );

  return counts;
};

export const queryOsvVulnerabilityCounts = async (
  ecosystem: OsvEcosystem,
  entries: OsvPackageVersion[],
): Promise<{ counts: Map<string, number>; error: string | null }> => {
  if (entries.length === 0) {
    return { counts: new Map(), error: null };
  }

  const counts = new Map<string, number>();

  try {
    for (let offset = 0; offset < entries.length; offset += OSV_BATCH_CHUNK_SIZE) {
      const chunk = entries.slice(offset, offset + OSV_BATCH_CHUNK_SIZE);
      const chunkCounts = await queryOsvBatchChunk(chunk, ecosystem);

      for (const [lookupKey, count] of chunkCounts) {
        counts.set(lookupKey, count);
      }
    }

    return { counts, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OSV vulnerability lookup failed.';
    console.error('OSV vulnerability lookup failed:', err);

    return { counts, error: message };
  }
};

export const attachOsvVulnerabilityCounts = async <T extends { name: string }>(
  ecosystem: OsvEcosystem,
  items: T[],
  getVersion: (item: T) => string | null,
  normalizePackageName: (name: string) => string = (name) => name,
): Promise<{ items: Array<T & { vulnerabilityCount: number | null }>; error: string | null }> => {
  const entries = items.flatMap((item) => {
    const version = getVersion(item);

    return version
      ? [
          {
            lookupKey: item.name,
            queryName: normalizePackageName(item.name),
            version,
          },
        ]
      : [];
  });

  const { counts, error } = await queryOsvVulnerabilityCounts(ecosystem, entries);

  const enriched = items.map((item) => {
    const version = getVersion(item);

    if (!version) {
      return { ...item, vulnerabilityCount: null };
    }

    if (error) {
      return { ...item, vulnerabilityCount: null };
    }

    return { ...item, vulnerabilityCount: counts.get(item.name) ?? 0 };
  });

  return { items: enriched, error };
};
