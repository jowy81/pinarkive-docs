import type { AppProps } from 'next/app'
import { JsonLd } from '../components/JsonLd'
import CookieAnalytics from '../components/CookieAnalytics'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <JsonLd />
      <Component {...pageProps} />
      <CookieAnalytics />
    </>
  )
}
