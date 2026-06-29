// Vercel serverless proxy for Overpass API.
// Uses Node.js built-in https module (no fetch — works on Node 16+).
// Reads body manually (Vercel non-Next.js does not auto-parse).

import https from 'https';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const TIMEOUT_MS = 28_000;

/** POST to an Overpass endpoint using Node's https module. */
function httpsPost(urlStr: string, postData: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Narch/1.0 (narch.vercel.app)',
        },
      },
      (res) => {
        if ((res.statusCode ?? 0) >= 400) {
          res.resume(); // drain so socket is released
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch { reject(new Error('Failed to parse Overpass JSON response')); }
        });
      },
    );

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error(`Overpass request timed out after ${TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/** Read the raw request body as a string (Vercel doesn't auto-parse for non-Next.js). */
function readRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    // If Vercel already parsed it, use that directly
    if (req.body !== undefined) {
      resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      return;
    }
    let data = '';
    req.on('data', (chunk: Buffer | string) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let query: string | undefined;
  try {
    const raw = await readRawBody(req);
    const parsed = typeof raw === 'object' ? raw : JSON.parse(raw);
    query = parsed?.query;
  } catch (e: any) {
    return res.status(400).json({ error: `Bad request body: ${e?.message}` });
  }

  if (!query) return res.status(400).json({ error: 'Missing "query" field in request body' });

  const postData = `data=${encodeURIComponent(query)}`;

  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`[overpass-proxy] Trying: ${endpoint}`);
      const data = await httpsPost(endpoint, postData);
      return res.status(200).json(data);
    } catch (err: any) {
      console.warn(`[overpass-proxy] Failed (${endpoint}): ${err?.message}`);
    }
  }

  return res.status(502).json({ error: 'All Overpass endpoints failed. Please try again.' });
}
