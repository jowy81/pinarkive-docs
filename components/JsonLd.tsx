import Head from 'next/head'
import { useRouter } from 'next/router'

const SITE_URL = 'https://docs.pinarkive.com'
const SITE_NAME = 'PinArkive Docs'

function segmentToName(segment: string): string {
  return segment
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

export function JsonLd() {
  const router = useRouter()
  const asPath = router.asPath.split('?')[0]
  const pathSegments = asPath === '/' ? [] : asPath.replace(/^\//, '').split('/').filter(Boolean)

  const canonicalUrl = asPath === '/' ? SITE_URL : `${SITE_URL}${asPath}`

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: typeof document !== 'undefined' ? document.title : SITE_NAME,
    description: 'PinArkive documentation — upload, pin and manage IPFS content using clusters and gateways.',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: 'en',
  }

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    ...pathSegments.map((segment, i) => ({
      name: segmentToName(segment),
      url: `${SITE_URL}/${pathSegments.slice(0, i + 1).join('/')}`,
    })),
  ]

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
      />
    </Head>
  )
}
