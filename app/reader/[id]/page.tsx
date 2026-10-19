import { AudiobookReader } from '@/components/audiobook-reader'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { id } = await params
  return <AudiobookReader userName={session.user.name} bookId={id} />
}
