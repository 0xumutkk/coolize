// Vercel serverless proxy — forwards Overpass QL queries server-side,
// bypassing the CORS restrictions that block browser-direct requests.

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const TIMEOUT_MS = 30_000;

async function queryEndpoint(base: string, query: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} from ${base}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body ?? {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query field' });
  }

  let lastErr: unknown;
  for (const base of ENDPOINTS) {
    try {
      const data = await queryEndpoint(base, query);
      // Set permissive CORS headers so the browser client can read the response
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json(data);
    } catch (err) {
      console.warn(`[overpass-proxy] ${base} failed:`, (err as any)?.message);
      lastErr = err;
    }
  }

  const msg = (lastErr as any)?.message ?? 'All Overpass endpoints failed';
  return res.status(502).json({ error: msg });
}
