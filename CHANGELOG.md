# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.7.0] - 2026-02-11

### Added
- **Preflight health check** — automatically checks for missing packages, outdated configs, and version mismatches on startup
- New `check_health` MCP tool — run health checks on demand from your editor
- **Prerequisites section** in README — clear guidance on required Storybook packages before install
- Detection for deprecated SB10 patterns: `argTypesRegex`, old `@storybook/testing-library` and `@storybook/jest` imports
- Detection for bundled addons that no longer need separate install in SB10 (`addon-essentials`, `addon-interactions`, `addon-links`, `addon-a11y`)
- Actionable install commands in preflight output

### Fixed
- Removed deprecated `argTypesRegex` from all generated preview templates (SB10 auto-detects actions)
- Added `@storybook/react-vite` to required packages list — was missing, causing `main.ts` framework errors

### Changed
- All generated configs now target Storybook 10+ by default
- Preview templates no longer include `actions.argTypesRegex` parameter

## [0.6.0] - 2026-02-10

### Changed
- Switched licensing provider from LemonSqueezy to Polar.sh
- Updated contact email to forgekit@pm.me

## [0.5.2] - 2026-02-10

### Fixed
- Updated all Storybook imports and dependencies for SB10 consolidated packages
- Storybook v10 support in `storybookVersion` config field

## [0.5.0] - 2026-02-09

### Added
- Storybook v10 types and configuration support
- `storybookVersion` config option

## [0.4.1] - 2026-02-08

### Added
- Initial public npm release as `forgekit-storybook-mcp`
- `--setup` command for scaffolding `.storybook/` config
- Auto-detection of UI framework (Chakra, shadcn, Tamagui, Gluestack, React Native)
- Auto-detection of Nx monorepo vs standard project
- 12 MCP tools: `list_components`, `analyze_component`, `generate_story`, `generate_test`, `generate_docs`, `validate_story`, `sync_all`, `sync_component`, `get_story_template`, `list_templates`, `get_component_coverage`, `suggest_stories`
- 8 story templates: basic, with-controls, with-variants, with-msw, with-router, page, interactive, form
- Auto-sync on startup with change detection and hash caching
- Free/Pro licensing model
- CLI flags: `--skip-init`, `--dry-run`, `--init-only`, `--no-stories`, `--no-tests`, `--no-docs`, `--no-update`
