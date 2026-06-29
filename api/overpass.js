// Vercel serverless proxy — Node.js CommonJS, no TypeScript, no external deps.
// Forwards Overpass QL queries server-side to avoid browser CORS blocks.

const https = require('https');

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const TIMEOUT_MS = 28000;

function httpsPost(urlStr, postData) {
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
          'User-Agent': 'Narch/1.0',
        },
      },
      (res) => {
        if (res.statusCode >= 400) {
          res.resume();
          return reject(new Error('HTTP ' + res.statusCode));
        }
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch { reject(new Error('JSON parse failed')); }
        });
      }
    );
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined) {
      const b = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      return resolve(b);
    }
    let data = '';
    req.on('data', (chunk) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let query;
  try {
    const raw = await readBody(req);
    const parsed = JSON.parse(raw);
    query = parsed && parsed.query;
  } catch (e) {
    return res.status(400).json({ error: 'Bad request body: ' + e.message });
  }

  if (!query) return res.status(400).json({ error: 'Missing query field' });

  const postData = 'data=' + encodeURIComponent(query);

  for (const endpoint of ENDPOINTS) {
    try {
      console.log('[overpass-proxy] trying:', endpoint);
      const data = await httpsPost(endpoint, postData);
      return res.status(200).json(data);
    } catch (err) {
      console.warn('[overpass-proxy] failed (' + endpoint + '):', err.message);
    }
  }

  return res.status(502).json({ error: 'All Overpass endpoints failed. Please try again.' });
};
