# Roadmap

What's coming for forgekit-storybook-mcp.

> Want to influence priorities? Open an issue or reach out at forgekit@pm.me

---

## Near-term

- [ ] **Storybook 10 migration assistant** — auto-fix outdated configs (rewrite `main.ts`, `preview.ts`, remove deprecated addons)
- [ ] **Runtime dependency suggestions** — detect when a template needs an addon that isn't installed and suggest the install command
- [ ] **Custom template directory** — load user-defined templates from a `templates/` folder
- [ ] **Component grouping** — auto-organize stories by feature/domain, not just library

## Mid-term

- [ ] **Watch mode** — auto-sync stories when component files change (file watcher)
- [ ] **Visual regression integration** — Chromatic / Percy snapshot setup
- [ ] **Multi-framework monorepo** — different UI frameworks per library in the same workspace
- [ ] **Story quality scoring** — rate existing stories on coverage, interaction tests, a11y, and suggest improvements
- [ ] **Nx generator** — `nx g @forgekit/storybook:setup` for monorepo integration

## Long-term

- [ ] **Figma → Story generation** — connect with ForgeKit core to generate stories directly from Figma components
- [ ] **AI-powered story suggestions** — analyze component complexity and recommend which templates/patterns to use
- [ ] **Storybook deployment automation** — build + deploy to Chromatic, S3, or Vercel from MCP
- [ ] **Design token sync** — keep Storybook theme in sync with Figma tokens via ForgeKit pipeline

---

## Completed

- [x] Preflight health check (0.7.0)
- [x] Storybook 10 support (0.5.0)
- [x] Auto-sync on startup (0.4.1)
- [x] Framework auto-detection (0.4.1)
- [x] `--setup` scaffolding (0.4.1)
- [x] Polar.sh licensing (0.6.0)
