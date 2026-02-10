# Copilot Instructions — forgekit-storybook-mcp

## Project Overview

This is an **MCP (Model Context Protocol) server** that auto-generates Storybook stories, tests, and MDX docs for React component libraries. It's published to npm as `forgekit-storybook-mcp` and runs as a CLI tool via stdio transport. It is **not** a React app itself—it analyzes and generates files in consumer projects.

## Architecture

```
src/
  cli.ts          → Entry point: parses CLI flags, loads config, runs init sync, starts MCP server
  index.ts        → MCP server setup: registers tools, resources, and request handlers via @modelcontextprotocol/sdk
  tools.ts        → Tool implementations (12 tools): bridges MCP request handlers to utility functions
  types.ts        → All shared TypeScript interfaces + DEFAULT_CONFIG
  utils/
    scanner.ts      → Component discovery (fast-glob) + prop/dependency extraction via regex
    generator.ts    → Story file generation (framework-aware, handles Chakra/shadcn/RN/etc.)
    initializer.ts  → Startup sync engine: hash-based change detection, creates/updates stories/tests/docs
    license.ts      → LemonSqueezy license validation with 24h file cache, feature gating (free vs pro)
    setup.ts        → Storybook bootstrapper: creates .storybook/ config, detects Nx monorepos & frameworks
    templates.ts    → 8 built-in story templates (basic, with-controls, with-msw, form, etc.)
    validator.ts    → Story file validator: 8 rule categories, scoring 0-100
    test-generator.ts → Generates Playwright or Vitest test files
    docs-generator.ts → Generates MDX documentation files
```

### Key Data Flow

1. **Config resolution** (`cli.ts`): `storybook-mcp.config.json` → `package.json["storybook-mcp"]` → auto-detection
2. **Startup sync** (`initializer.ts`): scan components → MD5 hash comparison via `.storybook-mcp-cache.json` → generate/update files
3. **MCP tool calls** (`index.ts` → `tools.ts` → `utils/*`): incoming JSON-RPC requests are routed by tool name through a `switch` statement to typed tool functions

### License Gating Pattern

All tool functions in `tools.ts` call `validateLicense()` + `requireFeature()` before executing pro features. Free tier: basic stories only, max 5 components. Pro tier: all templates, tests, docs, unlimited sync. The license cache lives at `~/.storybook-mcp/license-cache.json`.

## Build & Development

```bash
npm run build          # tsup → dist/ (ESM only, src/index.ts + src/cli.ts entry points)
npm run dev            # tsup --watch
npm run typecheck      # tsc --noEmit (no test suite exists)
npm run release        # build + npm publish --access public
npm run release:patch  # bump patch version + release
```

- **Bundler**: tsup (ESM format, generates `.d.ts`)
- **No test framework** is configured for this project itself
- **Node ≥ 18** required

## Code Conventions

- **ESM-only**: All imports use `.js` extensions (`import { foo } from './utils/scanner.js'`)—this is required even though source files are `.ts`
- **Types file**: All interfaces live in `src/types.ts` and are re-exported from `src/index.ts`. Add new types there, not inline
- **Tool pattern**: Each MCP tool has three layers: schema definition in `index.ts`, implementation in `tools.ts`, core logic in `utils/*.ts`. Follow this pattern when adding tools
- **Error handling**: Tool handlers in `index.ts` catch errors and return `{ isError: true }` MCP responses—never let exceptions propagate
- **Config threading**: `StorybookMCPConfig` is passed as the first argument to every tool and utility function
- **Logging**: Use `console.error()` (not `console.log`) for all server-side output—stdout is reserved for MCP JSON-RPC protocol

## Adding a New MCP Tool

1. Define the tool schema in `index.ts` inside the `ListToolsRequestSchema` handler
2. Add the implementation function in `tools.ts` (signature: `config, args` → result object with `summary`)
3. Add the `case` in the `CallToolRequestSchema` switch in `index.ts`
4. Add utility logic in the appropriate `utils/*.ts` file
5. Export the tool function from `tools.ts` and import it in `index.ts`

## Framework-Aware Generation

The `framework` config field (`chakra | shadcn | tamagui | gluestack | react-native | vanilla | custom`) changes:
- Story decorators and providers (`generator.ts`: `getFrameworkDecorator()`)
- Setup bootstrapping (`setup.ts`: preview files, dependency lists)
- Component analysis suggestions (`scanner.ts`)

When modifying generation logic, always handle the framework-specific branches.

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Add MCP tool | `index.ts`, `tools.ts`, relevant `utils/*.ts` |
| Change story output | `utils/generator.ts`, `utils/templates.ts` |
| Modify component scanning | `utils/scanner.ts` (regex-based prop extraction) |
| Update license/pricing logic | `utils/license.ts` |
| Change startup behavior | `cli.ts`, `utils/initializer.ts` |
| Add framework support | `utils/setup.ts`, `utils/generator.ts`, `utils/scanner.ts` |
