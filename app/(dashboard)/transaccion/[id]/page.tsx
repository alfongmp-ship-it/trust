import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  claimTransactionAction,
  markPaidAction,
  markDeliveredAction,
  markCompletedAction,
  openDisputeAction,
  closeDisputeAction,
} from '../../transactions-actions'
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
        {tx.delivered_at && (
          <Row label="Entregado el" value={formatDate(tx.delivered_at)} />
        )}
        {tx.release_at && (
          <Row label="Completado el" value={formatDate(tx.release_at)} />
        )}
        <Row label="Creada" value={formatDate(tx.created_at)} />
      </dl>

      <Actions tx={tx} isSeller={isSeller} isBuyer={isBuyer} canClaim={canClaim} />
    </div>
  )
}

function Actions({
  tx,
  isSeller,
  isBuyer,
  canClaim,
}: {
  tx: TransactionWithParties
  isSeller: boolean
  isBuyer: boolean
  canClaim: boolean
}) {
  // 1. Sin buyer todavía
  if (canClaim) {
    return (
      <form
        action={claimTransactionAction.bind(null, tx.id)}
        className="mt-4"
      >
        <button type="submit" className={btnPrimary}>
          Reclamar como comprador
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Al reclamar quedas registrado como comprador de esta transacción.
        </p>
      </form>
    )
  }

  if (isSeller && !tx.buyer_id) {
    return (
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4 text-sm">
        <div className="font-medium mb-1">Aún no hay comprador.</div>
        <div className="text-gray-700">
          Comparte este link con tu comprador para que lo reclame:
        </div>
        <code className="block mt-2 bg-white border rounded px-2 py-1 text-xs break-all">
          http://localhost:3000/transaccion/{tx.id}
        </code>
      </div>
    )
  }

  // 2. Ya con buyer — botones según status + rol
  if (tx.status === 'esperando_pago') {
    return isBuyer ? (
      <form action={markPaidAction.bind(null, tx.id)} className="mt-4">
        <button type="submit" className={btnPrimary}>
          Confirmar pago
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Marca esta transacción como pagada para que el vendedor proceda a entregarte.
        </p>
      </form>
    ) : (
      <Info text="Esperando que el comprador confirme el pago." />
    )
  }

  if (tx.status === 'pendiente_entrega') {
    if (isSeller) {
      return (
        <form action={markDeliveredAction.bind(null, tx.id)} className="mt-4">
          <button type="submit" className={btnPrimary}>
            Marcar como entregado
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Confirma que ya entregaste lo acordado al comprador.
          </p>
        </form>
      )
    }
    return (
      <div className="mt-4 space-y-3">
        <Info text="Esperando que el vendedor entregue." />
        <form action={openDisputeAction.bind(null, tx.id)}>
          <button type="submit" className={btnDanger}>
            Abrir disputa
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Si hay un problema con la entrega, abre una disputa.
          </p>
        </form>
      </div>
    )
  }

  if (tx.status === 'en_revision') {
    if (isBuyer) {
      return (
        <div className="mt-4 space-y-3">
          <form action={markCompletedAction.bind(null, tx.id)}>
            <button type="submit" className={btnSuccess}>
              Aprobar y completar
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Confirma que recibiste lo acordado y libera el pago al vendedor.
            </p>
          </form>
          <form action={openDisputeAction.bind(null, tx.id)}>
            <button type="submit" className={btnDanger}>
              Abrir disputa
            </button>
          </form>
        </div>
      )
    }
    return <Info text="Esperando que el comprador apruebe la entrega." />
  }

  if (tx.status === 'en_disputa') {
    return (
      <div className="mt-4 space-y-3">
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-900">
          Esta transacción está en disputa.
        </div>
        <form action={closeDisputeAction.bind(null, tx.id)}>
          <button type="submit" className={btnPrimary}>
            Cerrar disputa
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Cerrar la disputa la regresa a "En revisión" para que el comprador apruebe o re-dispute.
          </p>
        </form>
      </div>
    )
  }

  if (tx.status === 'completado') {
    return (
      <div className="mt-4 bg-green-50 border border-green-200 rounded p-4 text-sm text-green-900">
        Transacción completada{tx.release_at ? ` el ${formatDate(tx.release_at)}` : ''}.
      </div>
    )
  }

  return null
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

function Info({ text }: { text: string }) {
  return (
    <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-700">
      {text}
    </div>
  )
}

const btnPrimary =
  'bg-black text-white rounded px-4 py-2 font-medium hover:bg-gray-800'
const btnSuccess =
  'bg-green-600 text-white rounded px-4 py-2 font-medium hover:bg-green-700'
const btnDanger =
  'bg-red-600 text-white rounded px-4 py-2 font-medium hover:bg-red-700'
