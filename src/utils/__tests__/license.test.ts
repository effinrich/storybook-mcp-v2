import { describe, it, expect } from 'vitest'
import { validateLicense, checkFeatureAccess, requireFeature } from '../license.js'
import type { StorybookMCPConfig } from '../../types.js'
import type { Feature } from '../license.js'

function makeConfig(licenseKey?: string): StorybookMCPConfig {
  return {
    rootDir: '/tmp',
    libraries: [],
    framework: 'vanilla',
    storyFilePattern: '**/*.stories.{ts,tsx}',
    componentPatterns: [],
    excludePatterns: [],
    licenseKey,
  }
}

describe('license', () => {
  describe('free tier (no key)', () => {
    it('returns maxSyncLimit = 5', () => {
      const status = validateLicense(makeConfig())
      expect(status.maxSyncLimit).toBe(5)
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

    it('denies test_generation', () => {
      const status = validateLicense(makeConfig())
      expect(checkFeatureAccess('test_generation', status)).toBe(false)
    })

    it('denies docs_generation', () => {
      const status = validateLicense(makeConfig())
      expect(checkFeatureAccess('docs_generation', status)).toBe(false)
    })

    it('denies unlimited_sync', () => {
      const status = validateLicense(makeConfig())
      expect(checkFeatureAccess('unlimited_sync', status)).toBe(false)
    })

    it('requireFeature throws for pro features', () => {
      const status = validateLicense(makeConfig())
      expect(() => requireFeature('test_generation', status)).toThrow(/Pro license/)
      expect(() => requireFeature('docs_generation', status)).toThrow(/Pro license/)
      expect(() => requireFeature('advanced_templates', status)).toThrow(/Pro license/)
    })

    it('requireFeature does NOT throw for basic_stories', () => {
      const status = validateLicense(makeConfig())
      expect(() => requireFeature('basic_stories', status)).not.toThrow()
    })
  })

  describe('pro tier', () => {
    // Simulate a pro status directly since we can't hit real API
    const proStatus = { isValid: true, tier: 'pro' as const, maxSyncLimit: Infinity }

    it('allows all features', () => {
      const features: Feature[] = ['basic_stories', 'advanced_templates', 'test_generation', 'docs_generation', 'unlimited_sync']
      for (const feature of features) {
        expect(checkFeatureAccess(feature, proStatus)).toBe(true)
      }
    })

    it('has unlimited sync', () => {
      expect(proStatus.maxSyncLimit).toBe(Infinity)
    })

    it('requireFeature does not throw for any feature', () => {
      const features: Feature[] = ['basic_stories', 'advanced_templates', 'test_generation', 'docs_generation', 'unlimited_sync']
      for (const feature of features) {
        expect(() => requireFeature(feature, proStatus)).not.toThrow()
      }
    })
  })
})
