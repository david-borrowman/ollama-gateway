import { createHash, timingSafeEqual } from 'node:crypto';

export function parseTokens(raw) {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function digest(value) {
  return createHash('sha256').update(value).digest();
}

export function tokenMatches(presented, tokens) {
  if (typeof presented !== 'string' || presented.length === 0) return false;
  const presentedDigest = digest(presented);
  let matched = false;
  for (const token of tokens) {
    if (timingSafeEqual(presentedDigest, digest(token))) {
      matched = true;
    }
  }
  return matched;
}

export function bearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorizationHeader);
  return match ? match[1] : null;
}
