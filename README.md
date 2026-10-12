# ollama-gateway

Authenticated proxy for a local Ollama server. Ollama stays on localhost. This process checks a bearer token, then forwards only inference and read-only routes.

## Setup

```bash
cp .env.example .env
```

Edit `API_TOKENS` in `.env`. Use long random values. Separate more than one token with a comma.

```bash
npm start
```

The gateway listens on `http://127.0.0.1:11435` and proxies to `http://127.0.0.1:11434`. Set `HOST=0.0.0.0` to listen on all interfaces. Restart the process to add or revoke a token.

## Call Ollama

```bash
curl http://127.0.0.1:11435/api/tags \
  -H "Authorization: Bearer replace-me-token-1"
```

```bash
curl http://127.0.0.1:11435/api/chat \
  -H "Authorization: Bearer replace-me-token-1" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2","messages":[{"role":"user","content":"hello"}]}'
```

`GET /health` does not require a token and does not contact Ollama.

## Configuration

- `HOST` — bind address. Default `127.0.0.1`.
- `PORT` — listen port. Default `11435`.
- `OLLAMA_UPSTREAM` — Ollama base URL. Default `http://127.0.0.1:11434`.
- `API_TOKENS` — comma-separated bearer tokens. Required. The process exits if this is empty.

Requests without a matching `Authorization: Bearer` token receive `401`. Pull, push, create, copy, delete, and blob routes receive `403`.

## Tests

```bash
npm test
```
