/**
 * Auto-generate Mintlify documentation from source code
 * Reads tools.ts and creates MDX pages for each tool
 */

import fs from 'node:fs'
import path from 'node:path'

// Tool metadata extracted from README and types
const TOOL_METADATA = {
  list_components: {
    title: 'list_components',
    description: 'List all React components, filter by library or story status',
    icon: 'list',
    params: [
      { name: 'library', type: 'string', required: false, description: 'Filter by library name', default: 'all' },
      { name: 'hasStory', type: 'boolean', required: false, description: 'Filter by story status: true = only with stories, false = only without', default: 'all' },
    ],
  },
  analyze_component: {
    title: 'analyze_component',
    description: 'Extract props, dependencies, and get story suggestions',
    icon: 'magnifying-glass',
    params: [
      { name: 'componentPath', type: 'string', required: true, description: 'Path to the component file' },
    ],
  },
  generate_test: {
    title: 'generate_test',
    description: 'Generate test files — vitest by default, Playwright if installed',
    icon: 'flask',
    pro: true,
    params: [
      { name: 'componentPath', type: 'string', required: true, description: 'Path to the component file' },
      { name: 'overwrite', type: 'boolean', required: false, description: 'Replace existing test file', default: 'false' },
      { name: 'dryRun', type: 'boolean', required: false, description: 'Preview without writing to disk', default: 'false' },
    ],
  },
  generate_docs: {
    title: 'generate_docs',
    description: 'Generate MDX documentation',
    icon: 'book',
    pro: true,
    params: [
      { name: 'componentPath', type: 'string', required: true, description: 'Path to the component file' },
      { name: 'overwrite', type: 'boolean', required: false, description: 'Replace existing docs file', default: 'false' },
      { name: 'dryRun', type: 'boolean', required: false, description: 'Preview without writing to disk', default: 'false' },
    ],
  },
  validate_story: {
    title: 'validate_story',
    description: 'Check stories for best practices and issues',
    icon: 'check-circle',
    params: [
      { name: 'storyPath', type: 'string', required: true, description: 'Path to the story file' },
    ],
  },
  sync_all: {
    title: 'sync_all',
    description: 'Sync all components at once',
    icon: 'arrows-rotate',
    params: [
      { name: 'library', type: 'string', required: false, description: 'Only sync components in this library', default: 'all' },
      { name: 'generateStories', type: 'boolean', required: false, description: 'Generate story files', default: 'true' },
      { name: 'generateTests', type: 'boolean', required: false, description: 'Generate test files (Pro only)', default: 'true' },
      { name: 'generateDocs', type: 'boolean', required: false, description: 'Generate MDX docs (Pro only)', default: 'true' },
      { name: 'updateExisting', type: 'boolean', required: false, description: 'Update files when components change', default: 'true' },
      { name: 'dryRun', type: 'boolean', required: false, description: 'Preview without writing to disk', default: 'false' },
    ],
  },
  sync_component: {
    title: 'sync_component',
    description: "Sync a single component's story/test/docs",
    icon: 'arrow-rotate-right',
    params: [
      { name: 'componentPath', type: 'string', required: true, description: 'Path to the component file' },
      { name: 'generateStories', type: 'boolean', required: false, description: 'Generate story file', default: 'true' },
      { name: 'generateTests', type: 'boolean', required: false, description: 'Generate test file (Pro only)', default: 'true' },
      { name: 'generateDocs', type: 'boolean', required: false, description: 'Generate MDX docs (Pro only)', default: 'true' },
      { name: 'dryRun', type: 'boolean', required: false, description: 'Preview without writing to disk', default: 'false' },
    ],
  },
  get_component_coverage: {
    title: 'get_component_coverage',
    description: 'Get story coverage statistics',
    icon: 'chart-pie',
    params: [
      { name: 'library', type: 'string', required: false, description: 'Filter by library name', default: 'all' },
    ],
  },
  suggest_stories: {
    title: 'suggest_stories',
    description: 'Get prioritized list of components needing stories',
    icon: 'lightbulb',
    params: [
      { name: 'limit', type: 'number', required: false, description: 'Max number of suggestions', default: '10' },
      { name: 'library', type: 'string', required: false, description: 'Filter by library name', default: 'all' },
    ],
  },
  get_story_template: {
    title: 'get_story_template',
    description: 'Get a specific template',
    icon: 'rectangle-code',
    params: [
      { name: 'template', type: 'string', required: true, description: 'Template name (see Templates)' },
    ],
  },
  list_templates: {
    title: 'list_templates',
    description: 'List all available templates',
    icon: 'list-check',
    params: [],
  },
  check_health: {
    title: 'check_health',
    description: 'Check Storybook installation health',
    icon: 'heart-pulse',
    params: [],
  },
}

function generateToolPage(toolName: string, metadata: typeof TOOL_METADATA[keyof typeof TOOL_METADATA]): string {
  const { title, description, icon, params = [], pro = false } = metadata

  const proTag = pro ? '\n<Note>This tool requires a Pro license</Note>\n' : ''

  const paramsSection = params.length > 0
    ? `## Parameters

${params
  .map(
    (p) => `<ParamField path="${p.name}" type="${p.type}"${p.required ? ' required' : ''}${p.default ? ` default="${p.default}"` : ''}>
  ${p.description}
</ParamField>`
  )
  .join('\n\n')}
`
    : `## Parameters

This tool takes no parameters.

\`\`\`json
{}
\`\`\`
`

  return `---
title: '${title}'
description: '${description}'
---

${proTag}
## Overview

${description}

${paramsSection}
## Examples

<CodeGroup>
\`\`\`json Basic Usage
${params.length > 0 ? `{
  ${params.filter((p) => p.required).map((p) => `"${p.name}": "${p.type === 'string' ? 'example/path' : p.type === 'boolean' ? 'true' : '10'}"`).join(',\n  ')}
}` : '{}'}
\`\`\`
</CodeGroup>

## Response

Response structure varies by tool. See the full API documentation for details.

## Related Tools

<CardGroup cols={2}>
  <Card title="API Reference" icon="code" href="/api-reference/overview">
    View all available tools
  </Card>
  <Card title="Quickstart" icon="play" href="/quickstart">
    Get started guide
  </Card>
</CardGroup>
`
}

// Generate all tool pages
const docsDir = path.join(process.cwd(), 'docs', 'api-reference')

console.log('🚀 Generating API reference documentation...\n')

let generated = 0
let skipped = 0

for (const [toolName, metadata] of Object.entries(TOOL_METADATA)) {
  const filename = toolName.replace(/_/g, '-') + '.mdx'
  const filepath = path.join(docsDir, filename)

  // Skip if already exists (like generate-story.mdx which we created manually)
  if (fs.existsSync(filepath)) {
    console.log(`⏭️  Skipped ${filename} (already exists)`)
    skipped++
    continue
  }

  const content = generateToolPage(toolName, metadata)
  fs.writeFileSync(filepath, content, 'utf-8')
  console.log(`✅ Generated ${filename}`)
  generated++
}

console.log(`\n📊 Summary:`)
console.log(`   Generated: ${generated}`)
console.log(`   Skipped: ${skipped}`)
console.log(`   Total: ${Object.keys(TOOL_METADATA).length}`)
console.log(`\n✨ Done! Run 'mintlify dev' to preview.`)
