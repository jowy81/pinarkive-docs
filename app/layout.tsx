import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  title: { default: 'Pinarkive Documentation', template: '%s – Pinarkive' },
  description: 'IPFS pinning with clusters, gateways and timelocks.',
}

const navbar = (
  <Navbar
    logo={<span style={{ fontWeight: 700 }}>Pinarkive</span>}
    projectLink="https://github.com/pinarkive"
  />
)

const footer = (
  <Footer>
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
  </Footer>
)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pageMap = await getPageMap()
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/pinarkive/pinarkive-docs"
          footer={footer}
          nextThemes={{ defaultTheme: 'dark' }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
