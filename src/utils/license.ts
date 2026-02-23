/**
 * License Manager
 * Handles license validation and feature gating via Polar.sh API
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { StorybookMCPConfig } from '../types.js'
import {
  POLAR_UPGRADE_URL,
  LICENSE_CACHE_TTL_MS,
  FREE_TIER_MAX_SYNC
} from './constants.js'
import { LicenseError } from './errors.js'

const POLAR_ORG_ID =
  process.env.POLAR_ORG_ID || 'c39241cb-629a-4beb-8ec8-31820430d5fd'
const POLAR_API_URL = process.env.POLAR_API_URL || 'https://api.polar.sh'

export type Feature =
  | 'basic_stories'
  | 'advanced_templates'
  | 'test_generation'
  | 'docs_generation'
  | 'unlimited_sync'
  | 'code_connect'

interface LicenseStatus {
  isValid: boolean
  tier: 'free' | 'pro'
  maxSyncLimit: number
}

interface CachedLicense {
  key: string
  valid: boolean
  checkedAt: number
}

// Cache location
const CACHE_DIR = path.join(os.homedir(), '.forgekit')
const CACHE_FILE = path.join(CACHE_DIR, 'license-cache.json')

// Cache duration imported from constants

// Module-level cache for async validation results
let cachedValidation: LicenseStatus | null = null

/**
 * Read cached license status
 */
function readCache(): CachedLicense | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
    return data as CachedLicense
  } catch {
    return null
  }
}

/**
 * Write license status to cache
 */
function writeCache(cache: CachedLicense): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Validate license key via Polar.sh API
 * Uses the customer-portal endpoint (no auth token required)
 */
async function validateWithPolar(
  key: string
): Promise<{ valid: boolean; reason: string }> {
  try {
    const response = await fetch(
      `${POLAR_API_URL}/v1/customer-portal/license-keys/validate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key,
          organization_id: POLAR_ORG_ID
        })
      }
    )

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(
        `[storybook-mcp] Polar API returned HTTP ${response.status}: ${body.slice(0, 200)}`
      )
      return { valid: false, reason: `HTTP ${response.status}` }
    }

    const data = (await response.json()) as {
      id?: string
      status?: string
      expires_at?: string | null
    }

    // Check if key exists and is in granted status
    if (data.id && data.status === 'granted') {
      // Check expiration if set
      if (data.expires_at) {
        const expiresAt = new Date(data.expires_at)
        if (expiresAt < new Date()) {
          console.error(
            `[storybook-mcp] License key expired at ${data.expires_at}`
          )
          return { valid: false, reason: 'expired' }
        }
      }
      return { valid: true, reason: 'granted' }
    }

    const reason = data.status ? `status=${data.status}` : 'not found'
    console.error(
      `[storybook-mcp] License key rejected by Polar API (${reason})`
    )
    return { valid: false, reason }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[storybook-mcp] License validation network error: ${msg}`)
    return { valid: false, reason: `network error: ${msg}` }
  }
}

/**
 * Clear the on-disk license cache and reset the in-memory cache.
 * Forces the next validateLicenseAsync() call to re-validate against the API.
 */
export function resetLicenseCache(): void {
  cachedValidation = null
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE)
      console.error('[storybook-mcp] License cache cleared.')
    }
  } catch {
    // Ignore
  }
}

/**
 * Validate license key and return status (synchronous)
 *
 * Returns cached results from async validation if available.
 * Otherwise checks file cache or returns free tier.
 *
 * Call validateLicenseAsync() at startup to populate the cache.
 */
export function validateLicense(config: StorybookMCPConfig): LicenseStatus {
  const key = config.licenseKey || process.env.STORYBOOK_MCP_LICENSE

  // No key = Free Tier
  if (!key) {
    return {
      isValid: true,
      tier: 'free',
      maxSyncLimit: FREE_TIER_MAX_SYNC
    }
  }

  // Return cached validation result if available (set by validateLicenseAsync)
  if (cachedValidation !== null) {
    return cachedValidation
  }

  // Check file cache as fallback
  const cached = readCache()
  if (cached && cached.key === key) {
    const age = Date.now() - cached.checkedAt
    if (age < LICENSE_CACHE_TTL_MS) {
      return {
        isValid: cached.valid,
        tier: cached.valid ? 'pro' : 'free',
        maxSyncLimit: cached.valid ? Infinity : FREE_TIER_MAX_SYNC
      }
    }
  }

  // No cache available — key is present but validateLicenseAsync hasn't run yet
  // This shouldn't happen in normal operation (cli.ts calls validateLicenseAsync at startup)
  console.error(
    '[storybook-mcp] Warning: License key found but async validation not yet complete. Falling back to Free tier for this call.'
  )
  return {
    isValid: true,
    tier: 'free',
    maxSyncLimit: FREE_TIER_MAX_SYNC
  }
}

/**
 * Async license validation with API call
 * Call this at startup to validate and cache the result.
 * Populates the module-level cache for subsequent validateLicense() calls.
 *
 * @param config - MCP config (reads licenseKey field)
 * @param forceRefresh - If true, bypass all caches and re-validate against the API
 */
export async function validateLicenseAsync(
  config: StorybookMCPConfig,
  forceRefresh = false
): Promise<LicenseStatus> {
  const key = config.licenseKey || process.env.STORYBOOK_MCP_LICENSE

  if (!key) {
    console.error(
      '[storybook-mcp] No license key found (checked: config.licenseKey, STORYBOOK_MCP_LICENSE env var)'
    )
    console.error(
      `[storybook-mcp] Add licenseKey to storybook-mcp.config.json or set STORYBOOK_MCP_LICENSE env var`
    )
    const status: LicenseStatus = {
      isValid: true,
      tier: 'free',
      maxSyncLimit: FREE_TIER_MAX_SYNC
    }
    cachedValidation = status
    return status
  }

  const keySource = config.licenseKey
    ? 'config file'
    : 'STORYBOOK_MCP_LICENSE env var'
  console.error(
    `[storybook-mcp] Found license key (source: ${keySource}), validating...`
  )

  // Check cache first (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = readCache()
    if (cached && cached.key === key) {
      const age = Date.now() - cached.checkedAt
      if (age < LICENSE_CACHE_TTL_MS) {
        const ageHours = Math.round(age / 1000 / 60 / 60)
        console.error(
          `[storybook-mcp] Using cached license result (${ageHours}h old, valid for ${Math.round((LICENSE_CACHE_TTL_MS - age) / 1000 / 60 / 60)}h more)`
        )
        const status: LicenseStatus = {
          isValid: cached.valid,
          tier: cached.valid ? 'pro' : 'free',
          maxSyncLimit: cached.valid ? Infinity : FREE_TIER_MAX_SYNC
        }
        cachedValidation = status
        return status
      }
      console.error(
        '[storybook-mcp] Cached license result expired, re-validating...'
      )
    }
  } else {
    console.error(
      '[storybook-mcp] Force-refreshing license (bypassing cache)...'
    )
    resetLicenseCache()
  }

  // Validate with Polar
  const { valid: isValid, reason } = await validateWithPolar(key)

  // Write to file cache
  writeCache({
    key,
    valid: isValid,
    checkedAt: Date.now()
  })

  // Create status object
  const status: LicenseStatus = {
    isValid,
    tier: isValid ? 'pro' : 'free',
    maxSyncLimit: isValid ? Infinity : FREE_TIER_MAX_SYNC
  }

  // Store in module-level cache for synchronous access
  cachedValidation = status

  // Log result — use console.error (stdout is reserved for MCP JSON-RPC)
  if (!isValid) {
    console.error(
      `[storybook-mcp] License validation failed (${reason}). Using Free tier.`
    )
    console.error(
      `[storybook-mcp] If your key is valid, run with --reset-license to clear the cache and retry.`
    )
  } else {
    console.error(
      '[storybook-mcp] ✓ License validated successfully. Pro features enabled.'
    )
  }

  return status
}

/**
 * Check if a feature is allowed for the current license
 */
export function checkFeatureAccess(
  feature: Feature,
  status: LicenseStatus
): boolean {
  if (status.tier === 'pro') return true

  switch (feature) {
    case 'basic_stories':
      return true
    case 'test_generation':
      return true
    case 'docs_generation':
      return true
    case 'advanced_templates':
      return false
    case 'unlimited_sync':
      return false
    case 'code_connect':
      return false
    default:
      return false
  }
}

/**
 * Throw error if feature is not allowed
 */
export function requireFeature(feature: Feature, status: LicenseStatus): void {
  if (!checkFeatureAccess(feature, status)) {
    throw new LicenseError(
      `Feature '${feature}' requires a Pro license.\n` +
        `Please add a valid license key to your config or environment variable STORYBOOK_MCP_LICENSE.\n` +
        `Get your license at: ${POLAR_UPGRADE_URL}`,
      feature
    )
  }
}
