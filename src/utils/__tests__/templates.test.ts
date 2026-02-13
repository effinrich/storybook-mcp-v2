import { describe, it, expect } from 'vitest'
import { getTemplates, getTemplate } from '../templates.js'

describe('templates', () => {
  const templateNames = ['basic', 'with-controls', 'with-variants', 'with-msw', 'with-router', 'page', 'interactive', 'form']

  it('getTemplates returns all expected templates', () => {
    const templates = getTemplates()
    for (const name of templateNames) {
      expect(templates.has(name), `Missing template: ${name}`).toBe(true)
    }
  })

  it('getTemplate returns undefined for unknown template', () => {
    expect(getTemplate('nonexistent')).toBeUndefined()
  })

  for (const name of templateNames) {
    describe(`template: ${name}`, () => {
      it('contains SB10 Meta/StoryObj import', () => {
        const t = getTemplate(name)!
        expect(t.content).toContain("import type { Meta, StoryObj } from '@storybook/react'")
      })

      it('contains tags: [] (not autodocs)', () => {
        const t = getTemplate(name)!
        expect(t.content).toContain('tags: []')
        expect(t.content).not.toContain("'autodocs'")
        expect(t.content).not.toContain('"autodocs"')
      })

      it('does NOT contain storybook/blocks', () => {
        const t = getTemplate(name)!
        expect(t.content).not.toContain('storybook/blocks')
      })

      it('does NOT contain YAML frontmatter', () => {
        const t = getTemplate(name)!
        // Check the content doesn't start with --- (YAML frontmatter)
        expect(t.content.trimStart().startsWith('---')).toBe(false)
      })

      it('has valid structure (meta export, Story type)', () => {
        const t = getTemplate(name)!
        expect(t.content).toContain('export default meta')
        expect(t.content).toMatch(/type Story = StoryObj<typeof/)
      })

      it('has name, description, useCase, placeholders', () => {
        const t = getTemplate(name)!
        expect(t.name).toBeTruthy()
        expect(t.description).toBeTruthy()
        expect(t.useCase).toBeTruthy()
        expect(t.placeholders.length).toBeGreaterThan(0)
      })
    })
  }
})
