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

### Google Analytics 4 (GA4) + cookie consent

1. **Variable en Vercel**  
   En el proyecto de Vercel: **Settings → Environment Variables** añade:

   | Name | Value | Environment |
   |------|--------|-------------|
   | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-DPFDHZV1JY` | Production (y opcionalmente Preview) |

   Docs stream Measurement ID: **`G-DPFDHZV1JY`**. No reutilices el ID de Marketing ni el de App.

2. **Consentimiento**  
   El script de GA **no** se inyecta en el `<head>`. El componente `CookieAnalytics` muestra un banner Accept / Reject. Solo tras **Accept** se carga `gtag.js` y se envía un `page_view` real (y en cada cambio de ruta). Si el usuario rechaza, no se carga el script ni se envían hits.

3. **Re-deploy**  
   Después de crear o cambiar la variable, haz un nuevo deploy (o push a `main`) para que el build use el valor actual.

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
