/**
 * Story Version History
 * Records each generate/update event to .forgekit/story-history.json.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { FORGEKIT_DIR, STORY_HISTORY_FILENAME } from './constants.js'

const MAX_VERSIONS_PER_STORY = 10

export interface StoryHistoryEntry {
  storyPath: string
  componentPath: string
  version: number
  generatedAt: string
  /** MD5 of the written story content */
  storyHash: string
  action: 'created' | 'updated' | 'merged'
}

interface StoryHistory {
  schemaVersion: '1'
  /** Keyed by storyPath; array ordered oldest → newest */
  entries: Record<string, StoryHistoryEntry[]>
}

function historyFilePath(rootDir: string): string {
  return path.join(rootDir, FORGEKIT_DIR, STORY_HISTORY_FILENAME)
}

export function loadStoryHistory(rootDir: string): StoryHistory {
  const filePath = historyFilePath(rootDir)
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as StoryHistory
    }
  } catch {
    // Ignore — return clean state
  }
  return { schemaVersion: '1', entries: {} }
}

function saveStoryHistory(rootDir: string, history: StoryHistory): void {
  const filePath = historyFilePath(rootDir)
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8')
  } catch {
    // Non-fatal: swallow history write errors
  }
}

export function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Record a story generation or update event.
 * Automatically increments version and prunes to MAX_VERSIONS_PER_STORY entries.
 */
export function recordStoryVersion(
  rootDir: string,
  entry: Omit<StoryHistoryEntry, 'version'>
): void {
  const history = loadStoryHistory(rootDir)
  const existing = history.entries[entry.storyPath] ?? []

  const version = existing.length > 0 ? existing[existing.length - 1].version + 1 : 1

  existing.push({ ...entry, version })

  // Prune oldest if over limit
  if (existing.length > MAX_VERSIONS_PER_STORY) {
    existing.splice(0, existing.length - MAX_VERSIONS_PER_STORY)
  }

  history.entries[entry.storyPath] = existing
  saveStoryHistory(rootDir, history)
}

/**
 * Get version history for a specific story file.
 * Returns empty array if no history exists.
 */
export function getStoryVersions(
  rootDir: string,
  storyPath: string
): StoryHistoryEntry[] {
  const history = loadStoryHistory(rootDir)
  return history.entries[storyPath] ?? []
}
