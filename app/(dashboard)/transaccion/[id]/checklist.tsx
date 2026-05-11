'use client'

import { useState, useTransition } from 'react'
import {
  proposeChecklistAction,
  confirmChecklistAction,
} from '../../transactions-actions'
import type { ChecklistItem } from '@/lib/supabase/types'

type ItemDraft = { localId: number; text: string }

type Props = {
  txId: string
  items: ChecklistItem[]
  version: number
  lastProposedBy: 'seller' | 'buyer' | null
  myRole: 'seller' | 'buyer'
  canNegotiate: boolean // status permite editar (borrador / negociando / acordada)
  hasBuyer: boolean
}

let nextLocalId = 1
const draftFromItems = (items: ChecklistItem[]): ItemDraft[] =>
  items.map((it) => ({ localId: nextLocalId++, text: it.text }))

export function Checklist({
  txId,
  items,
  version,
  lastProposedBy,
  myRole,
  canNegotiate,
  hasBuyer,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<ItemDraft[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const startEdit = () => {
    setDrafts(items.length > 0 ? draftFromItems(items) : [{ localId: nextLocalId++, text: '' }])
    setErr(null)
    setEditing(true)
  }

  const submitPropose = () => {
    setErr(null)
    const cleaned: ChecklistItem[] = drafts
      .map((d) => ({ id: '', text: d.text.trim() }))
      .filter((d) => d.text.length > 0 && d.text.length <= 200)
    if (cleaned.length === 0) {
      setErr('La lista debe tener al menos un punto.')
      return
    }
    startTransition(async () => {
      try {
        await proposeChecklistAction(txId, cleaned, version)
        setEditing(false)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error al guardar.')
      }
    })
  }

  const submitConfirm = () => {
    setErr(null)
    startTransition(async () => {
      try {
        await confirmChecklistAction(txId, version)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error al confirmar.')
      }
    })
  }

  const myTurnToConfirm = canNegotiate && hasBuyer && lastProposedBy !== null && lastProposedBy !== myRole

  if (editing) {
    return (
      <div className="bg-white border rounded p-4 mt-4">
        <h2 className="text-sm font-medium mb-3">Proponer cambios a la lista</h2>
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded px-3 py-2 mb-3">
            {err}
          </div>
        )}
        <div className="space-y-2">
          {drafts.map((d, idx) => (
            <div key={d.localId} className="flex gap-2">
              <span className="text-gray-400 text-sm w-6 text-right pt-2">{idx + 1}.</span>
              <input
                type="text"
                value={d.text}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((p) => (p.localId === d.localId ? { ...p, text: e.target.value } : p)),
                  )
                }
                maxLength={200}
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setDrafts((prev) => prev.filter((p) => p.localId !== d.localId))}
                disabled={drafts.length === 1}
                className="text-gray-400 hover:text-red-600 disabled:opacity-30 text-sm px-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDrafts((prev) => [...prev, { localId: nextLocalId++, text: '' }])}
          disabled={drafts.length >= 20}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          + Agregar punto
        </button>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={submitPropose}
            disabled={isPending}
            className="bg-black text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : 'Guardar propuesta'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={isPending}
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Al guardar, la lista pasa a estado &quot;negociando&quot; y la otra parte tendrá que
          confirmar o proponer otra versión.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded p-4 mt-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium">
          Lista de términos
          <span className="text-xs text-gray-500 ml-2">v{version}</span>
        </h2>
        {lastProposedBy && (
          <span className="text-xs text-gray-500">
            Última propuesta: {lastProposedBy === myRole ? 'tú' : 'la otra parte'}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 italic">La lista está vacía.</p>
      ) : (
        <ol className="space-y-1 text-sm list-decimal list-inside">
          {items.map((it) => (
            <li key={it.id} className="text-gray-800">
              {it.text}
            </li>
          ))}
        </ol>
      )}

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded px-3 py-2 mt-3">
          {err}
        </div>
      )}

      {canNegotiate && (
        <div className="flex flex-wrap gap-2 mt-4">
          {myTurnToConfirm && (
            <button
              type="button"
              onClick={submitConfirm}
              disabled={isPending}
              className="bg-green-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? 'Confirmando…' : 'Confirmar lista'}
            </button>
          )}
          <button
            type="button"
            onClick={startEdit}
            disabled={isPending}
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Proponer cambios
          </button>
        </div>
      )}

      {canNegotiate && !hasBuyer && (
        <p className="text-xs text-gray-500 mt-3">
          La lista podrá negociarse cuando un comprador reclame la transacción.
        </p>
      )}
    </div>
  )
}
