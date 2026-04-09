/**
 * SuperBrain SDK — minimal Node client for the SN442 demo API.
 *
 * Wraps the Frankfurt seed node REST endpoints. Pure ES2020 + global fetch
 * (Node >= 18). No dependencies. Configurable base URL via constructor or
 * the SUPERBRAIN_NODE env var. Each method returns the parsed JSON body —
 * errors throw with status + endpoint context for fast debugging.
 */

'use strict'

const DEFAULT_NODE = 'http://46.225.114.202:8400'

function getBase(node) {
  return (node || process.env.SUPERBRAIN_NODE || DEFAULT_NODE).replace(/\/+$/, '')
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
 * @param {string} [options.node]             Base URL override
 */
async function share(content, options = {}) {
  if (!content || typeof content !== 'string') {
    throw new Error('SuperBrain SDK: share() requires string content')
  }
  const base = getBase(options.node)
  return http('POST', `${base}/knowledge/share`, {
    content,
    title: options.title || 'Untitled',
    source: options.source || 'superbrain-sdk',
    tags: Array.isArray(options.tags) ? options.tags : [],
    license: options.license || 'unknown',
    submitter: options.submitter || 'sb-user',
    contributor_hotkey: options.hotkey || '',
  })
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

module.exports = { query, share, earnings, peers }
module.exports.default = module.exports
