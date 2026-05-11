'use client'

import { useState, useTransition } from 'react'
import { simulatePaymentAction } from '../../transactions-actions'
import { formatCurrency } from '@/lib/utils/format'

export function DepositButton({ txId, amount }: { txId: string; amount: string }) {
  const [confirming, setConfirming] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    setErr(null)
    startTransition(async () => {
      try {
        await simulatePaymentAction(txId)
        setConfirming(false)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error al depositar.')
      }
    })
  }

  if (!confirming) {
    return (
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
        <div className="font-medium text-sm mb-1">Lista acordada</div>
        <p className="text-sm text-gray-700 mb-3">
          Deposita {formatCurrency(amount)} para que los fondos queden en custodia
          hasta que el vendedor entregue el documento.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="bg-black text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800"
        >
          Depositar {formatCurrency(amount)}
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Modo demo — no se procesa dinero real.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded p-4">
      <div className="font-medium text-sm mb-1">Confirmar depósito (demo)</div>
      <p className="text-sm text-gray-700 mb-3">
        Vas a depositar {formatCurrency(amount)}. Esto cambia el estado a &quot;Pagada&quot;
        y notifica al vendedor para que suba el documento.
      </p>
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded px-3 py-2 mb-3">
          {err}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="bg-black text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? 'Procesando…' : 'Confirmar depósito'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="border rounded px-4 py-2 text-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
