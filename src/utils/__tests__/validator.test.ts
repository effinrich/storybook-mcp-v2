import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { validateStory } from '../validator.js'
import type { StorybookMCPConfig } from '../../types.js'

let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-test-'))
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function makeConfig(): StorybookMCPConfig {
  return {
    rootDir: tmpDir,
    libraries: [],
    framework: 'vanilla',
    storyFilePattern: '**/*.stories.{ts,tsx}',
    componentPatterns: [],
    excludePatterns: [],
  }
}

function writeStory(name: string, content: string): string {
  const relPath = `${name}.stories.tsx`
  fs.writeFileSync(path.join(tmpDir, relPath), content)
  return relPath
}

describe('validator', () => {
  it('returns error for missing file', async () => {
    const result = await validateStory(makeConfig(), 'nonexistent.stories.tsx')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.code === 'FILE_NOT_FOUND')).toBe(true)
  })

  it('accepts valid SB10 story', async () => {
    const storyPath = writeStory('ValidButton', `
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: [],
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: { children: 'Click me' },
}
`)
    const result = await validateStory(makeConfig(), storyPath)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('warns about autodocs tag', async () => {
    const storyPath = writeStory('AutodocsButton', `
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {}
`)
    const result = await validateStory(makeConfig(), storyPath)
    expect(result.warnings.some(w => w.code === 'AUTODOCS_WITH_MDX')).toBe(true)
  })

  it('errors when missing storybook import', async () => {
    const storyPath = writeStory('NoImport', `
const meta = {
  title: 'Components/Button',
  component: 'Button',
}

export default meta

export const Default = {}
`)
    const result = await validateStory(makeConfig(), storyPath)
    expect(result.errors.some(e => e.code === 'MISSING_STORYBOOK_IMPORT')).toBe(true)
  })

  it('errors when missing component reference', async () => {
    const storyPath = writeStory('NoComponent', `
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  title: 'Components/Button',
}

export default meta

export const Default = {}
`)
    const result = await validateStory(makeConfig(), storyPath)
    expect(result.errors.some(e => e.code === 'NO_COMPONENT_REF')).toBe(true)
  })

  it('calculates score (100 for valid, lower for issues)', async () => {
    const validPath = writeStory('Scored', `
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: [],
  parameters: { backgrounds: {} },
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = { args: { children: 'Click', 'aria-label': 'btn' } }
export const Secondary: Story = { args: { children: 'Secondary' } }
`)
    const result = await validateStory(makeConfig(), validPath)
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})
