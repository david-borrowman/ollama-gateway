import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { bearerToken, parseTokens, tokenMatches } from './auth.js';
import { isAllowed } from './allowlist.js';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'authorization',
]);

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 11435);
const tokens = parseTokens(process.env.API_TOKENS);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer from 1 to 65535.');
  process.exit(1);
}

if (tokens.length === 0) {
  console.error('API_TOKENS is empty. Refusing to listen.');
  process.exit(1);
}

let upstreamOrigin;
try {
  upstreamOrigin = new URL(process.env.OLLAMA_UPSTREAM || 'http://127.0.0.1:11434');
  if (upstreamOrigin.protocol !== 'http:' && upstreamOrigin.protocol !== 'https:') {
    throw new Error('unsupported protocol');
  }
} catch {
  console.error('OLLAMA_UPSTREAM must be an http(s) URL.');
  process.exit(1);
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function upstreamHeaders(headers) {
  const blocked = new Set(HOP_BY_HOP);
  const connection = headers.connection;
  if (typeof connection === 'string') {
    for (const name of connection.split(',')) {
      const trimmed = name.trim().toLowerCase();
      if (trimmed) blocked.add(trimmed);
    }
  }

  const forwarded = {};
  for (const [key, value] of Object.entries(headers)) {
    if (blocked.has(key.toLowerCase()) || value === undefined) continue;
    forwarded[key] = value;
  }
  return forwarded;
}

async function proxy(req, res, url) {
  const upstreamUrl = new URL(url.pathname + url.search, upstreamOrigin);
  const controller = new AbortController();
  const abortIfClientGone = () => {
    if (!res.writableFinished) controller.abort();
  };
  res.on('close', abortIfClientGone);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders(req.headers),
      body: hasBody ? req : undefined,
      duplex: 'half',
      signal: controller.signal,
    });
  } catch {
    res.off('close', abortIfClientGone);
    if (res.writableEnded || controller.signal.aborted) {
      console.log(`${req.method} ${url.pathname} aborted`);
      return;
    }
    console.error(`${req.method} ${url.pathname} 502`);
    sendJson(res, 502, { error: 'upstream unavailable' });
    return;
  }

  const headers = {};
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  res.writeHead(upstream.status, headers);

  try {
    if (upstream.body) {
      await pipeline(Readable.fromWeb(upstream.body), res);
    } else {
      res.end();
    }
  } catch {
    controller.abort();
    if (!res.writableEnded) res.destroy();
  } finally {
    res.off('close', abortIfClientGone);
    console.log(`${req.method} ${url.pathname} ${upstream.status}`);
  }
}

const server = createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${host}`);
  } catch {
    sendJson(res, 400, { error: 'bad request' });
    console.log(`${req.method} 400`);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true });
    console.log('GET /health 200');
    return;
  }

  const presented = bearerToken(req.headers.authorization);
  if (!presented || !tokenMatches(presented, tokens)) {
    res.setHeader('www-authenticate', 'Bearer');
    sendJson(res, 401, { error: 'unauthorized' });
    console.log(`${req.method} ${url.pathname} 401`);
    return;
  }

  if (!isAllowed(req.method, url.pathname)) {
    sendJson(res, 403, { error: 'forbidden' });
    console.log(`${req.method} ${url.pathname} 403`);
    return;
  }

  proxy(req, res, url);
});

// Generations can run longer than Node's default 5 minute request timeout.
server.requestTimeout = 0;

server.listen(port, host, () => {
  console.log(`ollama-gateway listening on http://${host}:${port}`);
});
