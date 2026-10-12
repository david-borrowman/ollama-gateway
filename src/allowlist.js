const EXACT = new Set([
  'POST /api/chat',
  'POST /api/generate',
  'POST /api/embed',
  'POST /api/embeddings',
  'GET /api/tags',
  'POST /api/show',
  'GET /api/ps',
  'GET /api/version',
  'POST /v1/chat/completions',
  'POST /v1/completions',
  'POST /v1/embeddings',
  'GET /v1/models',
]);

const MODEL_NAME = /^\/v1\/models\/[^/]+$/;

export function isAllowed(method, pathname) {
  if (EXACT.has(`${method} ${pathname}`)) return true;
  return method === 'GET' && MODEL_NAME.test(pathname);
}
