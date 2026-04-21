# SuperBrain SDK

Minimal Node client for the **SuperBrain SN442** knowledge network on Bittensor.

Four functions: `query`, `share`, `earnings`, `peers`. No dependencies, just `fetch`. Works in Node 18+ and any modern runtime that ships a global `fetch`.

## Install

Not yet on npm (coming at mainnet). Install directly from GitHub:

```bash
npm install github:KatchDaVizion/superbrain-sdk
```

## Quick start

```js
const sb = require('superbrain-sdk')

// Ask the network a question
const a = await sb.query('What is SuperBrain?')
console.log(a.answer)

// Share a chunk and earn retrievals on your hotkey
const r = await sb.share('My validated knowledge', {
  title: 'My note',
  hotkey: '5EHQh8frNHpjY5Cw7HuPiNgN4DotBYXWnHk2dvDFbQqJmUTavk',
})
console.log(r.chunk_id)

// Check earnings
const e = await sb.earnings('5EHQh8frNHpjY5Cw7HuPiNgN4DotBYXWnHk2dvDFbQqJmUTavk')
console.log(`${e.chunks_contributed} chunks, ${e.total_retrievals} retrievals`)

// List peers
const p = await sb.peers()
console.log(`${p.length} peers online`)
```

## API

### `query(question, options?)`

Ask the SN442 network a question. Returns an answer with citations.

| Field | Type | Default | Description |
|---|---|---|---|
| `question` | `string` | required | Natural language question |
| `options.mode` | `string` | `'auto'` | `'auto'`, `'rag'`, or `'extractive'` |
| `options.node` | `string` | Frankfurt seed | Override base URL |

Returns `{ answer, citations, method, routed_to, routing_confidence, query_type, latency_ms, private, tier }`.

### `share(content, options?)`

File a knowledge chunk to SN442. Pass `hotkey` to attribute earnings.

| Field | Type | Default | Description |
|---|---|---|---|
| `content` | `string` | required | The text to share |
| `options.title` | `string` | `'Untitled'` | Chunk title |
| `options.source` | `string` | `'superbrain-sdk'` | Source label |
| `options.tags` | `string[]` | `[]` | Topic tags |
| `options.license` | `string` | `'unknown'` | Content license |
| `options.submitter` | `string` | `'sb-user'` | Submitter handle |
| `options.hotkey` | `string` | `''` | Bittensor ss58 — earns retrievals |

Returns `{ chunk_id, status, ... }`.

### `earnings(hotkey, options?)`

Get retrieval-based earnings for a specific Bittensor hotkey.

Returns `{ hotkey, chunks_contributed, total_retrievals, estimated_tao, last_updated }`.

### `peers(options?)`

List registered peers on the SN442 network.

Returns `Peer[]` — each peer has `{ node_id, url, last_seen, chunks, role }`.

## Configuration

### Custom seed node

Default: Frankfurt seed at `http://46.225.114.202:8400`. Override per-call:

```js
await sb.query('What is SuperBrain?', { node: 'http://my-node.example.com:8400' })
```

Or set globally via env var:

```bash
export SB_NODE_URL=http://my-node.example.com:8400
node my-app.js
```

`SUPERBRAIN_NODE` is also accepted as a fallback for backwards compatibility. Precedence: per-call `options.node` → `SB_NODE_URL` → `SUPERBRAIN_NODE` → Frankfurt default.

## Errors

All methods throw on network errors or non-2xx HTTP responses. The error message includes the method, URL, status code, and any `detail` field from the API.

```js
try {
  await sb.query('hello')
} catch (e) {
  console.error(e.message)
  // SuperBrain SDK: POST http://.../query returned 500 — "internal error"
}
```

## What this SDK is NOT

- Not a full Bittensor wallet client. Use `btcli` or `bittensor` Python package for staking, registration, and key management.
- Not a streaming client. All methods are request/response. Streaming chat is available through the SuperBrain desktop app or the `sb` CLI.
- Not yet published to npm — install from the GitHub URL above until mainnet launch.

## License

MIT &copy; KatchDaVizion
