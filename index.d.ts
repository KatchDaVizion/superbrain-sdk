/**
 * SuperBrain SDK — TypeScript definitions
 *
 * Minimal Node client for the SuperBrain SN442 demo API. All methods return
 * Promises and throw on non-2xx responses.
 */

export interface QueryOptions {
  /** Override the seed node base URL */
  node?: string
  /** Routing mode: 'auto' (default), 'rag', or 'extractive' */
  mode?: 'auto' | 'rag' | 'extractive'
}

export interface QueryResponse {
  answer: string
  citations: string[]
  method: string
  routed_to: string
  routing_confidence: number
  query_type: string
  latency_ms: number
  private: boolean
  tier: number
}

export interface ShareOptions {
  node?: string
  title?: string
  source?: string
  tags?: string[]
  license?: string
  submitter?: string
  /** Bittensor ss58 hotkey — earns retrieval-based TAO */
  hotkey?: string
  /** Topic category */
  category?: string
  /** Hex seed (64 chars / 32 bytes). When provided, the chunk is Ed25519-signed and
   *  the server verifies before persisting. Use generateSigningKey() to create one. */
  signingKey?: string
}

export interface ShareResponse {
  chunk_id: string
  status?: string
  success?: boolean
  message?: string
  privacy?: string
  /** "verified" | "legacy-unsigned" | "verify-skipped (pynacl missing)" */
  sig_reason?: string
  [key: string]: unknown
}

export interface SigningKey {
  /** 64-char hex (32-byte Ed25519 seed). Treat as private. */
  seedHex: string
  /** 64-char hex of the corresponding Ed25519 public key. Safe to publish. */
  publicKeyHex: string
}

export interface EarningsOptions {
  node?: string
}

export interface EarningsResponse {
  hotkey: string
  chunks_contributed: number
  total_retrievals: number
  estimated_tao: number
  chunks: Array<Record<string, unknown>>
  [key: string]: unknown
}

export interface PeersOptions {
  node?: string
}

export interface Peer {
  node_id: string
  url: string
  hotkey?: string
  city?: string
  lat?: number
  lon?: number
  chunks?: number
  online?: boolean
  is_seed?: boolean
  i2p?: string | null
  [key: string]: unknown
}

export interface PeersResponse {
  peers: Peer[]
}

/**
 * Ask the SN442 network a question. Returns an answer with citations and
 * routing metadata. The seed node decides between extractive and RAG modes.
 */
export function query(question: string, options?: QueryOptions): Promise<QueryResponse>

/**
 * Share a knowledge chunk to SN442. Pass `hotkey` to attribute earnings.
 * Returns the chunk_id and status.
 */
export function share(content: string, options?: ShareOptions): Promise<ShareResponse>

/**
 * Get retrieval-based earnings for a specific hotkey.
 */
export function earnings(hotkey: string, options?: EarningsOptions): Promise<EarningsResponse>

/**
 * List registered peers on the SN442 network.
 */
export function peers(options?: PeersOptions): Promise<PeersResponse>

/**
 * Generate a fresh Ed25519 signing keypair for attribution-proof contributions.
 * Persist `seedHex` securely; pass it as `options.signingKey` to share().
 */
export function generateSigningKey(): SigningKey

declare const sdk: {
  query: typeof query
  share: typeof share
  earnings: typeof earnings
  peers: typeof peers
  generateSigningKey: typeof generateSigningKey
}

export default sdk
