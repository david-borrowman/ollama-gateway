import assert from 'node:assert/strict';
import test from 'node:test';
import { bearerToken, parseTokens, tokenMatches } from '../src/auth.js';

test('parseTokens trims entries and drops empties', () => {
  assert.deepEqual(parseTokens(' a, ,b ,'), ['a', 'b']);
});

test('parseTokens returns an empty list for missing input', () => {
  assert.deepEqual(parseTokens(undefined), []);
  assert.deepEqual(parseTokens(''), []);
  assert.deepEqual(parseTokens(' , '), []);
});

test('tokenMatches accepts a configured token', () => {
  assert.equal(tokenMatches('alpha', ['alpha', 'beta']), true);
  assert.equal(tokenMatches('beta', ['alpha', 'beta']), true);
});

test('tokenMatches rejects missing, wrong, and different-length tokens', () => {
  const tokens = ['alpha'];
  assert.equal(tokenMatches('nope', tokens), false);
  assert.equal(tokenMatches('alph', tokens), false);
  assert.equal(tokenMatches('alpha-extra', tokens), false);
  assert.equal(tokenMatches('', tokens), false);
  assert.equal(tokenMatches(undefined, tokens), false);
  assert.equal(tokenMatches('alpha', []), false);
});

test('bearerToken reads a bearer credential', () => {
  assert.equal(bearerToken('Bearer secret-token'), 'secret-token');
  assert.equal(bearerToken('bearer secret-token'), 'secret-token');
  assert.equal(bearerToken('Bearer   secret-token  '), 'secret-token');
});

test('bearerToken rejects malformed authorization headers', () => {
  assert.equal(bearerToken(undefined), null);
  assert.equal(bearerToken('secret-token'), null);
  assert.equal(bearerToken('Basic secret-token'), null);
  assert.equal(bearerToken('Bearer one two'), null);
  assert.equal(bearerToken('Bearer'), null);
});
