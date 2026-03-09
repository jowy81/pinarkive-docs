# Pinarkive Documentation

Developer documentation for the [Pinarkive](https://pinarkive.com) platform — IPFS pinning with clusters, gateways and timelocks.

## Tech stack

- **Next.js** (App Router)
- **Nextra** docs theme
- **MDX** documentation pages
- **TypeScript**

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Deployment

The site is intended to be deployed at **docs.pinarkive.com**. Build the project and deploy the output (e.g. Vercel, or any static/Node host that supports Next.js).

## Project structure

- `app/` — Next.js App Router layout and catch-all route for MDX
- `content/` — All documentation in MDX (maps to URLs)
- `theme.config.tsx` — Nextra theme and navigation config

## Links

- [Pinarkive](https://pinarkive.com)
- [GitHub](https://github.com/pinarkive)
