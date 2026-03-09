const config = {
  logo: <span style={{ fontWeight: 700 }}>Pinarkive</span>,
  project: {
    link: 'https://github.com/pinarkive',
  },
  docsRepositoryBase: 'https://github.com/pinarkive/pinarkive-docs',
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Pinarkive',
      description: 'IPFS pinning with clusters, gateways and timelocks.',
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Pinarkive Documentation" />
      <meta property="og:description" content="IPFS pinning with clusters, gateways and timelocks." />
    </>
  ),
  primaryHue: { dark: 200, light: 220 },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  footer: {
    text: (
      <span>
        Powered by Pinarkive · Built for developers using IPFS ·{' '}
        <a href="https://pinarkive.com" target="_blank" rel="noopener noreferrer">
          pinarkive.com
        </a>
        {' · '}
        <a href="https://github.com/pinarkive" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </span>
    ),
  },
  toc: {
    backToTop: true,
  },
}

export default config
