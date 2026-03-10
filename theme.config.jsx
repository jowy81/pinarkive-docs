import { useRouter } from 'next/router'

const SITE_URL = 'https://docs.pinarkive.com'
const DEFAULT_TITLE = 'PinArkive — Your decentralized storage solution.'
const DEFAULT_DESCRIPTION = 'Documentation for PinArkive: upload, pin and manage IPFS content using clusters and gateways. Your decentralized storage solution.'
const OG_IMAGE = 'https://pinarkive.com/img/logo_fullmark.png'

export default {
  logo: <span style={{ fontWeight: 700 }}>PinArkive</span>,
  project: {
    link: 'https://github.com/pinarkive',
  },
  useNextSeoProps() {
    const { asPath } = useRouter()
    const canonical = asPath === '/' ? SITE_URL : `${SITE_URL}${asPath}`
    return {
      titleTemplate: '%s – PinArkive',
      defaultTitle: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonical,
      openGraph: {
        type: 'website',
        url: canonical,
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        images: [{ url: OG_IMAGE, alt: 'PinArkive' }],
        siteName: 'PinArkive Docs',
      },
      twitter: {
        cardType: 'summary_large_image',
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        image: OG_IMAGE,
      },
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content={DEFAULT_DESCRIPTION} />
      <meta name="keywords" content="PinArkive, IPFS, decentralized storage, pinning, clusters, gateways, documentation, API, CLI" />
      <link rel="icon" href="https://pinarkive.com/img/favicon.ico" sizes="any" />
      <link rel="apple-touch-icon" href="https://pinarkive.com/img/logo_fullmark.png" />
      <meta property="og:title" content={DEFAULT_TITLE} />
      <meta property="og:description" content={DEFAULT_DESCRIPTION} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="PinArkive Docs" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={DEFAULT_TITLE} />
      <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
      <meta name="twitter:image" content={OG_IMAGE} />
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
              `,
            }}
          />
        </>
      )}
    </>
  ),
  primaryHue: { dark: 200, light: 220 },
  nextThemes: {
    defaultTheme: 'dark',
  },
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
