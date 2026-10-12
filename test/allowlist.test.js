import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowed } from '../src/allowlist.js';

const ALLOWED = [
  ['POST', '/api/chat'],
  ['POST', '/api/generate'],
  ['POST', '/api/embed'],
  ['POST', '/api/embeddings'],
  ['GET', '/api/tags'],
  ['POST', '/api/show'],
  ['GET', '/api/ps'],
  ['GET', '/api/version'],
  ['POST', '/v1/chat/completions'],
  ['POST', '/v1/completions'],
  ['POST', '/v1/embeddings'],
  ['GET', '/v1/models'],
  ['GET', '/v1/models/llama3.2'],
  ['GET', '/v1/models/llama3.2:latest'],
];

test('allows inference and read-only routes', () => {
  for (const [method, pathname] of ALLOWED) {
    assert.equal(isAllowed(method, pathname), true, `${method} ${pathname}`);
  }
});

test('blocks model management and unknown routes', () => {
  const blocked = [
    ['POST', '/api/pull'],
    ['POST', '/api/push'],
    ['POST', '/api/create'],
    ['POST', '/api/copy'],
    ['DELETE', '/api/delete'],
    ['POST', '/api/blobs/sha256:abc'],
    ['HEAD', '/api/blobs/sha256:abc'],
    ['GET', '/api/chat'],
    ['POST', '/api/tags'],
    ['GET', '/v1/models/llama3.2/extra'],
    ['POST', '/v1/models/llama3.2'],
    ['GET', '/api/chat/'],
    ['GET', '/health'],
    ['POST', '/api/generate/'],
  ];
  for (const [method, pathname] of blocked) {
    assert.equal(isAllowed(method, pathname), false, `${method} ${pathname}`);
  }
});
