import { redirect } from 'next/navigation'

export default async function ConfirmAddressRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/address-confirmation?id=${id}`)
}
