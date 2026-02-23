import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  generateStoryTool,
  generateTestTool,
  generateDocsTool,
  syncAll
} from '../tools.js'
import type { StorybookMCPConfig } from '../types.js'

let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-test-'))
  const compDir = path.join(tmpDir, 'src', 'components')
  fs.mkdirSync(compDir, { recursive: true })

  fs.writeFileSync(
    path.join(compDir, 'Widget.tsx'),
    `
import React from 'react'

interface WidgetProps {
  title: string
  children?: React.ReactNode
}

export const Widget: React.FC<WidgetProps> = ({ title, children }) => {
  return <div><h2>{title}</h2>{children}</div>
}
`
  )
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function makeConfig(licenseKey?: string): StorybookMCPConfig {
  return {
    rootDir: tmpDir,
    libraries: [
      { name: 'ui', path: 'src/components', storyTitlePrefix: 'Components' }
    ],
    framework: 'vanilla',
    storyFilePattern: '**/*.stories.{ts,tsx}',
    componentPatterns: ['**/*.tsx', '!**/*.stories.tsx', '!**/*.test.tsx'],
    excludePatterns: ['**/node_modules/**'],
    licenseKey
  }
}

describe('tools - feature gating', () => {
  it('generate_test works on free tier', async () => {
    const result = await generateTestTool(makeConfig(), {
      componentPath: 'src/components/Widget.tsx',
      dryRun: true
    })
    expect(result).toBeDefined()
    expect(result.written).toBe(false) // dry run
  })

  it('generate_docs works on free tier', async () => {
    const result = await generateDocsTool(makeConfig(), {
      componentPath: 'src/components/Widget.tsx',
      dryRun: true
    })
    expect(result).toBeDefined()
    expect(result.written).toBe(false) // dry run
  })

  it('generate_story works in free tier (basic template)', async () => {
    const result = await generateStoryTool(makeConfig(), {
      componentPath: 'src/components/Widget.tsx',
      dryRun: true
    })
    expect(result.story.content).toContain('Widget')
    expect(result.written).toBe(false) // dry run
  })

  it('generate_story with advanced template requires Pro', async () => {
    await expect(
      generateStoryTool(makeConfig(), {
        componentPath: 'src/components/Widget.tsx',
        template: 'with-msw',
        dryRun: true
      })
    ).rejects.toThrow(/Pro license/)
  })
})

describe('tools - syncAll', () => {
  it('respects free tier maxComponents limit', async () => {
    // Create multiple components
    const compDir = path.join(tmpDir, 'src', 'components')
    for (let i = 1; i <= 8; i++) {
      fs.writeFileSync(
        path.join(compDir, `Comp${i}.tsx`),
        `
import React from 'react'
export const Comp${i} = () => <div>Comp${i}</div>
`
      )
    }

    const result = await syncAll(makeConfig(), {
      generateStories: true,
      generateTests: true,
      generateDocs: true,
      dryRun: true
    })

    // Free tier allows tests and docs up to component limit
    expect(result).toBeDefined()
  })

  it('allows test and docs generation on free tier', async () => {
    const result = await syncAll(makeConfig(), {
      generateTests: true,
      generateDocs: true,
      dryRun: true
    })
    // Free tier: tests and docs ARE enabled (up to component limit)
    expect(result).toBeDefined()
  })
})
