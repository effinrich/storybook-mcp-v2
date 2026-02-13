import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runPreflight } from '../preflight.js'

let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-test-'))
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('preflight', () => {
  it('fails when required packages are missing', async () => {
    // Empty project - no node_modules
    const result = await runPreflight(tmpDir)
    expect(result.passed).toBe(false)
    
    // Should flag missing packages
    const failedChecks = result.checks.filter(c => c.status === 'fail')
    expect(failedChecks.length).toBeGreaterThan(0)
    
    // Should specifically flag @storybook/addon-docs
    const addonDocsCheck = result.checks.find(c => c.name === 'package:@storybook/addon-docs')
    expect(addonDocsCheck).toBeDefined()
    expect(addonDocsCheck!.status).toBe('fail')
  })

  it('provides install commands for missing packages', async () => {
    const result = await runPreflight(tmpDir)
    expect(result.installCommands.length).toBeGreaterThan(0)
    expect(result.installCommands[0]).toContain('npm install')
  })

  it('checks for storybook package', async () => {
    const result = await runPreflight(tmpDir)
    const sbCheck = result.checks.find(c => c.name === 'package:storybook')
    expect(sbCheck).toBeDefined()
    expect(sbCheck!.status).toBe('fail')
  })

  it('checks for framework package', async () => {
    const result = await runPreflight(tmpDir)
    const fwCheck = result.checks.find(c => c.name === 'package:framework')
    expect(fwCheck).toBeDefined()
    expect(fwCheck!.status).toBe('fail')
  })

  it('warns about missing .storybook/main config', async () => {
    const result = await runPreflight(tmpDir)
    const mainCheck = result.checks.find(c => c.name === 'config:main')
    expect(mainCheck).toBeDefined()
    expect(mainCheck!.status).toBe('warn')
  })

  it('generates summary string', async () => {
    const result = await runPreflight(tmpDir)
    expect(result.summary).toBeTruthy()
    expect(typeof result.summary).toBe('string')
  })
})
