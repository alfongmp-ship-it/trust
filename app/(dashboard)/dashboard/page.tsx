import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  formatCurrency,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
  TYPE_LABELS,
} from '@/lib/utils/format'
import type { TransactionWithParties } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: transactions } = await supabase
    .from('transactions')
    .select(
      `
      *,
      seller:users!transactions_seller_id_fkey (id, full_name, email),
      buyer:users!transactions_buyer_id_fkey (id, full_name, email)
    `,
    )
    .or(`seller_id.eq.${user!.id},buyer_id.eq.${user!.id}`)
    .order('created_at', { ascending: false })
    .returns<TransactionWithParties[]>()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Mis transacciones</h1>
        <Link
          href="/nueva-transaccion"
          className="bg-black text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800"
        >
          + Nueva
        </Link>
      </div>

      {!transactions || transactions.length === 0 ? (
        <div className="bg-white border rounded p-8 text-center text-gray-500">
          Aún no tienes transacciones. Crea la primera.
        </div>
      ) : (
        <div className="bg-white border rounded divide-y">
          {transactions.map((tx) => {
            const isSeller = tx.seller_id === user!.id
            const counterpart = isSeller ? tx.buyer : tx.seller
            return (
              <Link
                key={tx.id}
                href={`/transaccion/${tx.id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium">
                    {formatCurrency(tx.amount)} · {TYPE_LABELS[tx.type]}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[tx.status]}`}
                  >
                    {STATUS_LABELS[tx.status]}
                  </span>
                </div>
                <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    {isSeller ? 'Vendes a' : 'Compras a'}:{' '}
                    {counterpart?.full_name ??
                      counterpart?.email ??
                      '— sin asignar —'}
                  </span>
                  <span>{formatDate(tx.created_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
