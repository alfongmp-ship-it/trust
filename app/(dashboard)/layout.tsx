import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/app/(auth)/actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            Trust
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">{user.email}</span>
            <form action={signOutAction}>
              <button type="submit" className="underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto p-4">{children}</div>
    </div>
  )
}
