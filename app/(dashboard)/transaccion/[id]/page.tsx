import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { claimTransactionAction } from '../../transactions-actions'
import {
  formatCurrency,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
  TYPE_LABELS,
} from '@/lib/utils/format'
import type { TransactionWithParties } from '@/lib/supabase/types'

export default async function TransaccionPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tx } = await supabase
    .from('transactions')
    .select(
      `
      *,
      seller:users!transactions_seller_id_fkey (id, full_name, email, phone),
      buyer:users!transactions_buyer_id_fkey (id, full_name, email, phone)
    `,
    )
    .eq('id', params.id)
    .single<TransactionWithParties>()

  if (!tx) notFound()

  const isSeller = tx.seller_id === user!.id
  const isBuyer = tx.buyer_id === user!.id
  const canClaim = !tx.buyer_id && !isSeller
  const isAuthorized = isSeller || isBuyer || canClaim

  if (!isAuthorized) notFound()

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Transacción</h1>
        <span
          className={`text-sm px-3 py-1 rounded ${STATUS_COLORS[tx.status]}`}
        >
          {STATUS_LABELS[tx.status]}
        </span>
      </div>

      <dl className="bg-white border rounded p-6 space-y-3 text-sm">
        <Row label="Monto" value={formatCurrency(tx.amount)} />
        <Row label="Tipo" value={TYPE_LABELS[tx.type]} />
        <Row label="Descripción" value={tx.description || '—'} />
        <Row
          label="Vendedor"
          value={tx.seller?.full_name ?? tx.seller?.email ?? '—'}
        />
        <Row
          label="Comprador"
          value={
            tx.buyer?.full_name ?? tx.buyer?.email ?? '— sin asignar —'
          }
        />
        <Row
          label="Fecha límite entrega"
          value={formatDate(tx.delivery_deadline)}
        />
        <Row label="Creada" value={formatDate(tx.created_at)} />
      </dl>

      {canClaim && (
        <form
          action={claimTransactionAction.bind(null, tx.id)}
          className="mt-4"
        >
          <button
            type="submit"
            className="bg-black text-white rounded px-4 py-2 font-medium hover:bg-gray-800"
          >
            Reclamar como comprador
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Al reclamar quedas registrado como comprador de esta transacción.
          </p>
        </form>
      )}

      {isSeller && !tx.buyer_id && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4 text-sm">
          <div className="font-medium mb-1">Aún no hay comprador.</div>
          <div className="text-gray-700">
            Comparte este link con tu comprador para que lo reclame:
          </div>
          <code className="block mt-2 bg-white border rounded px-2 py-1 text-xs break-all">
            http://localhost:3000/transaccion/{tx.id}
          </code>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-600">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}
