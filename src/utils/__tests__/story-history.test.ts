import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { loadStoryHistory, recordStoryVersion, getStoryVersions, hashContent } from '../story-history.js'
import { FORGEKIT_DIR, STORY_HISTORY_FILENAME } from '../constants.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'story-history-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

const BASE_ENTRY = {
  storyPath: 'src/components/Button.stories.tsx',
  componentPath: 'src/components/Button.tsx',
  generatedAt: new Date().toISOString(),
  storyHash: hashContent('export const Default: Story = {}'),
  action: 'created' as const,
}

describe('loadStoryHistory', () => {
  it('returns empty history when no file exists', () => {
    const history = loadStoryHistory(tmpDir)
    expect(history.schemaVersion).toBe('1')
    expect(history.entries).toEqual({})
  })

  it('returns empty history when file is corrupted', () => {
    const dir = path.join(tmpDir, FORGEKIT_DIR)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, STORY_HISTORY_FILENAME), 'not-json', 'utf-8')
    const history = loadStoryHistory(tmpDir)
    expect(history.entries).toEqual({})
  })
})

describe('recordStoryVersion', () => {
  it('creates .forgekit/story-history.json on first call', () => {
    recordStoryVersion(tmpDir, BASE_ENTRY)

    const filePath = path.join(tmpDir, FORGEKIT_DIR, STORY_HISTORY_FILENAME)
    expect(fs.existsSync(filePath)).toBe(true)
  })

  it('sets version to 1 for first entry', () => {
    recordStoryVersion(tmpDir, BASE_ENTRY)

    const versions = getStoryVersions(tmpDir, BASE_ENTRY.storyPath)
    expect(versions).toHaveLength(1)
    expect(versions[0].version).toBe(1)
    expect(versions[0].action).toBe('created')
  })

  it('increments version on subsequent calls', () => {
    recordStoryVersion(tmpDir, BASE_ENTRY)
    recordStoryVersion(tmpDir, { ...BASE_ENTRY, action: 'merged' })

    const versions = getStoryVersions(tmpDir, BASE_ENTRY.storyPath)
    expect(versions).toHaveLength(2)
    expect(versions[1].version).toBe(2)
    expect(versions[1].action).toBe('merged')
  })

  it('tracks different story paths independently', () => {
    const otherEntry = { ...BASE_ENTRY, storyPath: 'src/components/Card.stories.tsx', componentPath: 'src/components/Card.tsx' }
    recordStoryVersion(tmpDir, BASE_ENTRY)
    recordStoryVersion(tmpDir, otherEntry)

    const buttonVersions = getStoryVersions(tmpDir, BASE_ENTRY.storyPath)
    const cardVersions = getStoryVersions(tmpDir, otherEntry.storyPath)

    expect(buttonVersions).toHaveLength(1)
    expect(cardVersions).toHaveLength(1)
    expect(buttonVersions[0].version).toBe(1)
    expect(cardVersions[0].version).toBe(1)
  })

  it('prunes to 10 entries when limit is exceeded', () => {
    for (let i = 0; i < 12; i++) {
      recordStoryVersion(tmpDir, { ...BASE_ENTRY, action: i % 2 === 0 ? 'created' : 'updated' })
    }

    const versions = getStoryVersions(tmpDir, BASE_ENTRY.storyPath)
    expect(versions).toHaveLength(10)
    // The remaining versions should be the newest ones (highest version numbers)
    expect(versions[0].version).toBe(3)
    expect(versions[9].version).toBe(12)
  })
})

describe('getStoryVersions', () => {
  it('returns empty array for unknown story path', () => {
    const versions = getStoryVersions(tmpDir, 'does/not/exist.stories.tsx')
    expect(versions).toEqual([])
  })

  it('returns all recorded versions for a known path', () => {
    recordStoryVersion(tmpDir, BASE_ENTRY)
    recordStoryVersion(tmpDir, { ...BASE_ENTRY, action: 'updated' })

    const versions = getStoryVersions(tmpDir, BASE_ENTRY.storyPath)
    expect(versions).toHaveLength(2)
    expect(versions.map(v => v.action)).toEqual(['created', 'updated'])
  })
})

describe('hashContent', () => {
  it('returns a non-empty string', () => {
    expect(hashContent('hello')).toBeTruthy()
  })

  it('returns different hashes for different content', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'))
  })

  it('returns same hash for same content', () => {
    expect(hashContent('same')).toBe(hashContent('same'))
  })
})
