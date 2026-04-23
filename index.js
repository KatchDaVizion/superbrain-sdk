/**
 * SuperBrain SDK — minimal Node client for the SN442 demo API.
 *
 * Wraps the Frankfurt seed node REST endpoints. Pure ES2020 + global fetch
 * (Node >= 18). No dependencies. Configurable base URL via constructor or
 * the SB_NODE_URL env var (SUPERBRAIN_NODE is also accepted for back-compat).
 * Each method returns the parsed JSON body — errors throw with status +
 * endpoint context for fast debugging.
 */

'use strict'

const crypto = require('node:crypto')

const DEFAULT_NODE = 'http://46.225.114.202:8400'

// Ed25519 PKCS8 DER prefix (RFC 8410). Prepend to a 32-byte seed to get a valid PKCS8 key.
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')

function _seedToPrivateKey(seedHex) {
  if (typeof seedHex !== 'string' || seedHex.length !== 64) {
    throw new Error('SuperBrain SDK: signingKey must be a 64-char hex string (32-byte ed25519 seed)')
  }
  const seed = Buffer.from(seedHex, 'hex')
  if (seed.length !== 32) throw new Error('SuperBrain SDK: signingKey hex decoded to ' + seed.length + ' bytes (need 32)')
  const der = Buffer.concat([PKCS8_ED25519_PREFIX, seed])
  return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
}

function _publicKeyHex(privateKey) {
  const spkiDer = crypto.createPublicKey(privateKey).export({ format: 'der', type: 'spki' })
  return spkiDer.subarray(spkiDer.length - 32).toString('hex')
}

function _canonicalizeShareBody(obj) {
  const ordered = {
    category: (obj.category || '').trim() || 'general',
    content: obj.content,
    hotkey: obj.contributor_hotkey || obj.hotkey || '',
    source: obj.source,
    title: obj.title,
  }
  return Buffer.from(JSON.stringify(ordered, Object.keys(ordered).sort()), 'utf-8')
}

/**
 * Generate a fresh Ed25519 signing keypair. Returns { seedHex, publicKeyHex }.
 * Persist `seedHex` somewhere safe (it's the private key). `publicKeyHex` is public.
 */
function generateSigningKey() {
  const seed = crypto.randomBytes(32)
  const seedHex = seed.toString('hex')
  const publicKeyHex = _publicKeyHex(_seedToPrivateKey(seedHex))
  return { seedHex, publicKeyHex }
}

function getBase(node) {
  return (
    node ||
    process.env.SB_NODE_URL ||
    process.env.SUPERBRAIN_NODE ||
    DEFAULT_NODE
  ).replace(/\/+$/, '')
}

async function http(method, url, body) {
  const opts = { method, headers: { Accept: 'application/json' } }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(url, opts)
  } catch (e) {
    throw new Error(`SuperBrain SDK: network error calling ${method} ${url} — ${e.message}`)
  }
  const text = await res.text()
  let parsed
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }
  if (!res.ok) {
    const detail = typeof parsed === 'object' && parsed?.detail ? ` — ${JSON.stringify(parsed.detail)}` : ''
    throw new Error(`SuperBrain SDK: ${method} ${url} returned ${res.status}${detail}`)
  }
  return parsed
}

/**
 * Ask the network a question. Returns { answer, citations, method, routed_to,
 * routing_confidence, query_type, latency_ms, private, tier }.
 *
 * @param {string} question
 * @param {object} [options]
 * @param {string} [options.node]   Base URL for the seed node
 * @param {string} [options.mode]   'auto' (default), 'rag', 'extractive'
 */
async function query(question, options = {}) {
  if (!question || typeof question !== 'string') {
    throw new Error('SuperBrain SDK: query() requires a string question')
  }
  const base = getBase(options.node)
  return http('POST', `${base}/query`, {
    question,
    mode: options.mode || 'auto',
  })
}

/**
 * Share a knowledge chunk to the SN442 network. Returns { chunk_id, status,
 * timestamp, ... }. Pass `hotkey` to earn retrieval-based TAO under your ss58.
 *
 * @param {string} content
 * @param {object} [options]
 * @param {string} [options.title]            Default 'Untitled'
 * @param {string} [options.source]           Default 'superbrain-sdk'
 * @param {string[]} [options.tags]           Default []
 * @param {string} [options.license]          Default 'unknown'
 * @param {string} [options.submitter]        Default 'sb-user'
 * @param {string} [options.hotkey]           Bittensor ss58 — earns retrievals
 * @param {string} [options.category]         Topic category (default '')
 * @param {string} [options.signingKey]       Hex seed (64 chars) — if provided, the chunk is Ed25519-signed and the server
 *                                             verifies the signature. Use generateSigningKey() to create one.
 * @param {string} [options.node]             Base URL override
 */
async function share(content, options = {}) {
  if (!content || typeof content !== 'string') {
    throw new Error('SuperBrain SDK: share() requires string content')
  }
  const base = getBase(options.node)
  const body = {
    content,
    title: options.title || 'Untitled',
    source: options.source || 'superbrain-sdk',
    tags: Array.isArray(options.tags) ? options.tags : [],
    license: options.license || 'unknown',
    submitter: options.submitter || 'sb-user',
    contributor_hotkey: options.hotkey || '',
    category: options.category || '',
  }

  if (options.signingKey) {
    const privateKey = _seedToPrivateKey(options.signingKey)
    const publicKeyHex = _publicKeyHex(privateKey)
    const canonical = _canonicalizeShareBody(body)
    const signatureHex = crypto.sign(null, canonical, privateKey).toString('hex')
    body.public_key = publicKeyHex
    body.signature = signatureHex
  }

  return http('POST', `${base}/knowledge/share`, body)
}

/**
 * Get earnings for a specific hotkey. Returns { hotkey, chunks_contributed,
 * total_retrievals, estimated_tao, last_updated }.
 *
 * @param {string} hotkey   Bittensor ss58 address (required)
 * @param {object} [options]
 * @param {string} [options.node]
 */
async function earnings(hotkey, options = {}) {
  if (!hotkey || typeof hotkey !== 'string') {
    throw new Error('SuperBrain SDK: earnings() requires a hotkey ss58 string')
  }
  const base = getBase(options.node)
  return http('GET', `${base}/earnings/${encodeURIComponent(hotkey)}`)
}

/**
 * List registered peers on the SN442 network. Returns an array of peer
 * descriptors: { node_id, url, last_seen, chunks, role, ... }.
 *
 * @param {object} [options]
 * @param {string} [options.node]
 */
async function peers(options = {}) {
  const base = getBase(options.node)
  return http('GET', `${base}/peers`)
}

module.exports = { query, share, earnings, peers, generateSigningKey }
module.exports.default = module.exports
