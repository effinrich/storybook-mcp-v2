import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { scanComponents, analyzeComponent, toKebabCase } from '../scanner.js'
import type { StorybookMCPConfig } from '../../types.js'

let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-test-'))

  // Create src/components structure
  const compDir = path.join(tmpDir, 'src', 'components')
  fs.mkdirSync(compDir, { recursive: true })

  // Simple component
  fs.writeFileSync(
    path.join(compDir, 'Button.tsx'),
    `
import React from 'react'

interface ButtonProps {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return <button {...props}>{children}</button>
}
`
  )

  // Component with Chakra import
  fs.writeFileSync(
    path.join(compDir, 'ChakraCard.tsx'),
    `
import React from 'react'
import { Box, Text } from '@chakra-ui/react'

interface ChakraCardProps {
  title: string
}

export const ChakraCard: React.FC<ChakraCardProps> = ({ title }) => {
  return <Box><Text>{title}</Text></Box>
}
`
  )

  // Component with router import
  fs.writeFileSync(
    path.join(compDir, 'NavLink.tsx'),
    `
import React from 'react'
import { Link } from 'react-router-dom'

export const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
  return <Link to={to}>{children}</Link>
}
`
  )

  // Component with Gluestack import
  fs.writeFileSync(
    path.join(compDir, 'GluestackButton.tsx'),
    `
import React from 'react'
import { Button, ButtonText } from '@gluestack-ui/themed'

export const GluestackButton = ({ label }: { label: string }) => {
  return <Button><ButtonText>{label}</ButtonText></Button>
}
`
  )

  // Existing story file for Button
  fs.writeFileSync(
    path.join(compDir, 'Button.stories.tsx'),
    `
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
const meta: Meta<typeof Button> = { title: 'Components/Button', component: Button, tags: [] }
export default meta
type Story = StoryObj<typeof Button>
export const Default: Story = {}
`
  )

  // Non-component file that should be skipped
  fs.writeFileSync(
    path.join(compDir, 'utils.ts'),
    `export const noop = () => {}`
  )
  fs.writeFileSync(
    path.join(compDir, 'types.ts'),
    `export interface Foo { bar: string }`
  )
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function makeConfig(): StorybookMCPConfig {
  return {
    rootDir: tmpDir,
    libraries: [
      { name: 'ui', path: 'src/components', storyTitlePrefix: 'Components' }
    ],
    framework: 'vanilla',
    storyFilePattern: '**/*.stories.{ts,tsx}',
    componentPatterns: ['**/*.tsx', '!**/*.stories.tsx', '!**/*.test.tsx'],
    excludePatterns: ['**/node_modules/**']
  }
}

describe('scanner', () => {
  it('finds components in temp directory', async () => {
    const components = await scanComponents(makeConfig())
    const names = components.map(c => c.name)
    expect(names).toContain('Button')
    expect(names).toContain('ChakraCard')
    expect(names).toContain('NavLink')
    expect(names).toContain('GluestackButton')
  })

  it('skips non-component files (utils, types)', async () => {
    const components = await scanComponents(makeConfig())
    const names = components.map(c => c.name)
    expect(names).not.toContain('Utils')
    expect(names).not.toContain('Types')
  })

  it('detects existing story files', async () => {
    const components = await scanComponents(makeConfig())
    const button = components.find(c => c.name === 'Button')!
    expect(button.hasStory).toBe(true)

    const chakraCard = components.find(c => c.name === 'ChakraCard')!
    expect(chakraCard.hasStory).toBe(false)
  })

  it('filters by hasStory', async () => {
    const withStory = await scanComponents(makeConfig(), { hasStory: true })
    expect(withStory.every(c => c.hasStory)).toBe(true)

    const withoutStory = await scanComponents(makeConfig(), { hasStory: false })
    expect(withoutStory.every(c => !c.hasStory)).toBe(true)
  })

  it('analyzeComponent extracts props', async () => {
    const analysis = await analyzeComponent(
      makeConfig(),
      'src/components/Button.tsx'
    )
    expect(analysis.name).toBe('Button')
    const propNames = analysis.props.map(p => p.name)
    expect(propNames).toContain('variant')
    expect(propNames).toContain('size')
    expect(propNames).toContain('disabled')
    expect(propNames).toContain('children')
  })

  it('analyzeComponent detects Chakra dependency', async () => {
    const analysis = await analyzeComponent(
      makeConfig(),
      'src/components/ChakraCard.tsx'
    )
    expect(analysis.dependencies.usesChakra).toBe(true)
  })

  it('analyzeComponent detects router dependency', async () => {
    const analysis = await analyzeComponent(
      makeConfig(),
      'src/components/NavLink.tsx'
    )
    expect(analysis.dependencies.usesRouter).toBe(true)
  })

  it('analyzeComponent detects Gluestack dependency', async () => {
    const analysis = await analyzeComponent(
      makeConfig(),
      'src/components/GluestackButton.tsx'
    )
    expect(analysis.dependencies.usesGluestack).toBe(true)
  })

  it('analyzeComponent throws for missing file', async () => {
    await expect(
      analyzeComponent(makeConfig(), 'src/components/Missing.tsx')
    ).rejects.toThrow()
  })

  it('toKebabCase works correctly', () => {
    expect(toKebabCase('MyComponent')).toBe('my-component')
    expect(toKebabCase('NavLink')).toBe('nav-link')
    expect(toKebabCase('ABCWidget')).toBe('abcwidget')
  })

  it('detects story in root-level src/stories/ (default Storybook scaffold location)', async () => {
    // Mirrors the consumer layout:
    //   src/components/base/buttons/button.tsx   ← component
    //   src/stories/Button.stories.ts            ← pre-existing scaffold story
    const nestedCompDir = path.join(
      tmpDir,
      'src',
      'components',
      'base',
      'buttons'
    )
    const rootStoriesDir = path.join(tmpDir, 'src', 'stories')
    fs.mkdirSync(nestedCompDir, { recursive: true })
    fs.mkdirSync(rootStoriesDir, { recursive: true })

    fs.writeFileSync(
      path.join(nestedCompDir, 'NestedButton.tsx'),
      `
import React from 'react'
export const NestedButton = ({ children }: { children: React.ReactNode }) => <button>{children}</button>
`
    )
    fs.writeFileSync(
      path.join(rootStoriesDir, 'NestedButton.stories.ts'),
      `
import type { Meta, StoryObj } from '@storybook/react'
const meta: Meta = { title: 'Components/NestedButton', component: () => null, tags: [] }
export default meta
export const Default = {}
`
    )

    const config: StorybookMCPConfig = {
      rootDir: tmpDir,
      libraries: [
        { name: 'ui', path: 'src/components', storyTitlePrefix: 'Components' }
      ],
      framework: 'vanilla',
      storyFilePattern: '**/*.stories.{ts,tsx}',
      componentPatterns: ['**/*.tsx', '!**/*.stories.tsx', '!**/*.test.tsx'],
      excludePatterns: ['**/node_modules/**']
    }

    const components = await scanComponents(config)
    const btn = components.find(c => c.name === 'NestedButton')
    expect(btn).toBeDefined()
    // Should have found the root-level story — NOT mark it as missing
    expect(btn!.hasStory).toBe(true)
    expect(btn!.storyPath).toContain('NestedButton.stories.ts')
  })
})
