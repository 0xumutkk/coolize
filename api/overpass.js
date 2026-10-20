// Vercel serverless proxy — Node.js CommonJS, no TypeScript, no external deps.
// Fetches OpenStreetMap data server-side via official OSM API v0.6 (map.json)
// with automatic quadrant splitting for dense areas and Overpass fallback.

const https = require('https');

const ENDPOINTS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

const TIMEOUT_MS = 10000;

function httpsGetJson(urlStr, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NarchClimateAnalysis/1.0 (https://narch.app)',
        },
      },
      (res) => {
        if (res.statusCode >= 400) {
          let errText = '';
          res.setEncoding('utf8');
          res.on('data', (c) => { errText += c; });
          res.on('end', () => {
            const err = new Error('HTTP ' + res.statusCode + ': ' + errText.slice(0, 120));
            err.statusCode = res.statusCode;
            reject(err);
          });
          return;
        }
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error('JSON parse failed'));
          }
        });
      }
    );
    req.setTimeout(timeoutMs || TIMEOUT_MS, () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchOsmMapBBox(bbox) {
  const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  try {
    return await httpsGetJson(url, 12000);
  } catch (err) {
    // If bbox has >50,000 nodes, OSM API v0.6 returns HTTP 400. Split into 2x2 quadrants.
    if (err && err.statusCode === 400) {
      const midLat = (bbox.south + bbox.north) / 2;
      const midLon = (bbox.west + bbox.east) / 2;
      const quads = [
        { south: bbox.south, west: bbox.west, north: midLat, east: midLon },
        { south: bbox.south, west: midLon, north: midLat, east: bbox.east },
        { south: midLat, west: bbox.west, north: bbox.north, east: midLon },
        { south: midLat, west: midLon, north: bbox.north, east: bbox.east },
      ];
      const results = await Promise.all(
        quads.map((q) =>
          httpsGetJson(
            `https://api.openstreetmap.org/api/0.6/map.json?bbox=${q.west},${q.south},${q.east},${q.north}`,
            12000
          )
        )
      );
      const seen = new Set();
      const merged = [];
      for (const r of results) {
        for (const el of (r && r.elements) || []) {
          const key = el.type + ':' + el.id;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(el);
          }
        }
      }
      return { elements: merged };
    }
    throw err;
  }
}

function extractBBox(parsed) {
  if (
    parsed &&
    parsed.bbox &&
    Number.isFinite(Number(parsed.bbox.south)) &&
    Number.isFinite(Number(parsed.bbox.west)) &&
    Number.isFinite(Number(parsed.bbox.north)) &&
    Number.isFinite(Number(parsed.bbox.east))
  ) {
    return {
      south: Number(parsed.bbox.south),
      west: Number(parsed.bbox.west),
      north: Number(parsed.bbox.north),
      east: Number(parsed.bbox.east),
    };
  }
  const q = (parsed && parsed.query) || '';
  const m = q.match(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/);
  if (m) {
    return {
      south: Number(m[1]),
      west: Number(m[2]),
      north: Number(m[3]),
      east: Number(m[4]),
    };
  }
  return null;
}

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
          'User-Agent': 'NarchClimateAnalysis/1.0 (https://narch.app)',
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
          try {
            const parsed = JSON.parse(raw);
            if (
              parsed &&
              typeof parsed.remark === 'string' &&
              (!Array.isArray(parsed.elements) || parsed.elements.length === 0)
            ) {
              return reject(new Error('Overpass runtime error: ' + parsed.remark));
            }
            resolve(parsed);
          } catch {
            reject(new Error('JSON parse failed'));
          }
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

  let parsed;
  try {
    const raw = await readBody(req);
    parsed = JSON.parse(raw);
  } catch (e) {
    return res.status(400).json({ error: 'Bad request body: ' + e.message });
  }

  const query = parsed && parsed.query;
  const bbox = extractBBox(parsed);

  if (!query && !bbox) return res.status(400).json({ error: 'Missing query or bbox field' });

  // 1. Primary fast path: official OpenStreetMap API v0.6 map.json (Fastly CDN, <1s)
  if (bbox) {
    try {
      const latSpan = bbox.north - bbox.south;
      const lonSpan = bbox.east - bbox.west;
      const padLat = latSpan < 0.003 ? Math.min(Math.max(latSpan * 0.5, 0.0008), 0.0015) : 0;
      const padLon = lonSpan < 0.003 ? Math.min(Math.max(lonSpan * 0.5, 0.0008), 0.0015) : 0;
      const paddedBBox = {
        south: bbox.south - padLat,
        west: bbox.west - padLon,
        north: bbox.north + padLat,
        east: bbox.east + padLon,
      };
      const data = await fetchOsmMapBBox(paddedBBox);
      return res.status(200).json(data);
    } catch (err) {
      console.warn('[overpass-proxy] osm v0.6 map.json failed:', err.message);
    }
  }

  // 2. Fallback: Overpass QL mirrors
  if (query) {
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
  }

  return res.status(504).json({
    error: 'OpenStreetMap veri servisi zaman aşımına uğradı. Lütfen tekrar deneyin veya biraz daha küçük bir alan seçin.'
  });
};
