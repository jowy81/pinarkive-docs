import { generateStaticParamsFor, importPage } from 'nextra/pages'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata(props: { params: Promise<{ mdxPath?: string[] }> }) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath ?? [])
  return metadata
}

export default async function Page(props: { params: Promise<{ mdxPath?: string[] }> }) {
  const params = await props.params
  const pathSegments = params.mdxPath ?? []
  const { default: MDXContent } = await importPage(pathSegments)
  return <MDXContent {...props} params={params} />
}
