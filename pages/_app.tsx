import type { AppProps } from 'next/app'
import { JsonLd } from '../components/JsonLd'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <JsonLd />
      <Component {...pageProps} />
    </>
  )
}
