import { ReaderDashboard } from '@/components/reader-dashboard'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { audiobookProgress, book } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [books, progress] = await Promise.all([
    db.select().from(book).where(eq(book.userId, session.user.id)).orderBy(desc(book.updatedAt)),
    db.select().from(audiobookProgress).where(eq(audiobookProgress.userId, session.user.id)).orderBy(desc(audiobookProgress.updatedAt)),
  ])

  return <ReaderDashboard userName={session.user.name} books={books} progress={progress} />
}
