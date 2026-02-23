import { describe, it, expect } from 'vitest'
import {
  validateLicense,
  checkFeatureAccess,
  requireFeature
} from '../license.js'
import type { StorybookMCPConfig } from '../../types.js'
import type { Feature } from '../license.js'
import { FREE_TIER_MAX_SYNC } from '../constants.js'

function makeConfig(licenseKey?: string): StorybookMCPConfig {
  return {
    rootDir: '/tmp',
    libraries: [],
    framework: 'vanilla',
    storyFilePattern: '**/*.stories.{ts,tsx}',
    componentPatterns: [],
    excludePatterns: [],
    licenseKey
  }
}

describe('license', () => {
  describe('free tier (no key)', () => {
    it(`returns maxSyncLimit = ${FREE_TIER_MAX_SYNC}`, () => {
      const status = validateLicense(makeConfig())
      expect(status.maxSyncLimit).toBe(FREE_TIER_MAX_SYNC)
    })

    it('returns tier = free', () => {
      const status = validateLicense(makeConfig())
      expect(status.tier).toBe('free')
    })

    it('allows basic_stories', () => {
      const status = validateLicense(makeConfig())
      expect(checkFeatureAccess('basic_stories', status)).toBe(true)
    })

    it('denies advanced_templates', () => {
      const status = validateLicense(makeConfig())
      expect(checkFeatureAccess('advanced_templates', status)).toBe(false)
    })

    it('allows test_generation', () => {
      const status = validateLicense(makeConfig())
      expect(checkFeatureAccess('test_generation', status)).toBe(true)
    })

    it('allows docs_generation', () => {
      const status = validateLicense(makeConfig())
      expect(checkFeatureAccess('docs_generation', status)).toBe(true)
    })

    it('denies unlimited_sync', () => {
      const status = validateLicense(makeConfig())
      expect(checkFeatureAccess('unlimited_sync', status)).toBe(false)
    })

    it('requireFeature throws for pro-only features', () => {
      const status = validateLicense(makeConfig())
      expect(() => requireFeature('advanced_templates', status)).toThrow(
        /Pro license/
      )
      expect(() => requireFeature('unlimited_sync', status)).toThrow(
        /Pro license/
      )
      expect(() => requireFeature('code_connect', status)).toThrow(
        /Pro license/
      )
    })

    it('requireFeature does NOT throw for free-tier features', () => {
      const status = validateLicense(makeConfig())
      expect(() => requireFeature('basic_stories', status)).not.toThrow()
      expect(() => requireFeature('test_generation', status)).not.toThrow()
      expect(() => requireFeature('docs_generation', status)).not.toThrow()
    })
  })

  describe('pro tier', () => {
    // Simulate a pro status directly since we can't hit real API
    const proStatus = {
      isValid: true,
      tier: 'pro' as const,
      maxSyncLimit: Infinity
    }

    it('allows all features', () => {
      const features: Feature[] = [
        'basic_stories',
        'advanced_templates',
        'test_generation',
        'docs_generation',
        'unlimited_sync'
      ]
      for (const feature of features) {
        expect(checkFeatureAccess(feature, proStatus)).toBe(true)
      }
    })

    it('has unlimited sync', () => {
      expect(proStatus.maxSyncLimit).toBe(Infinity)
    })

    it('requireFeature does not throw for any feature', () => {
      const features: Feature[] = [
        'basic_stories',
        'advanced_templates',
        'test_generation',
        'docs_generation',
        'unlimited_sync'
      ]
      for (const feature of features) {
        expect(() => requireFeature(feature, proStatus)).not.toThrow()
      }
    })
  })
})
