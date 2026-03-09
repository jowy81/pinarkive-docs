# Pinarkive Documentation

Developer documentation for the [Pinarkive](https://pinarkive.com) platform — IPFS pinning with clusters, gateways and timelocks.

## Tech stack

- **Next.js** (Pages Router)
- **Nextra 2** + **nextra-theme-docs**
- **MDX** documentation in `pages/`
- **TypeScript**

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the **left sidebar navigation** (Quickstart, API Reference, Concepts, CLI, Examples) and the main content area.

## Build

```bash
npm run build
npm start
```

## Deployment

Deploy at **docs.pinarkive.com** (e.g. Vercel). The project builds as a standard Next.js app with the Pages Router.

## Project structure

- `pages/` — All documentation (MDX) and `_meta.json` per folder for sidebar order and titles
  - `index.mdx` — Home with "Try Pinarkive in 30 seconds"
  - `quickstart/` — Introduction, Upload your first file
  - `api-reference/` — POST /files, POST /pin, GET /files, DELETE /file, GET /clusters (do not use `pages/api/`; Next.js reserves it for API routes)
  - `concepts/` — Gateways, Clusters, Timelocks
  - `cli/` — Installation, Commands
  - `examples/` — Upload Playground, Encrypted Share, API Playground
- `theme.config.jsx` — Nextra docs theme config (logo, footer, sidebar options)

## Links

- [Pinarkive](https://pinarkive.com)
- [GitHub](https://github.com/pinarkive)
