'use client'

import { useState, useTransition } from 'react'
import {
  acceptDocumentAction,
  requestEditAction,
  openDocumentDisputeAction,
} from '../../transactions-actions'
import type { ChecklistItem } from '@/lib/supabase/types'

type Mode = 'idle' | 'accept' | 'edit' | 'dispute'

type Props = {
  txId: string
  previewUrl: string | null
  checklist: ChecklistItem[]
}

export function DecidePanel({ txId, previewUrl, checklist }: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [editComment, setEditComment] = useState('')
  const [disputeComment, setDisputeComment] = useState('')
  const [disputePoint, setDisputePoint] = useState<string>(checklist[0]?.id ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = () => {
    setMode('idle')
    setErr(null)
    setEditComment('')
    setDisputeComment('')
  }

  const doAccept = () => {
    setErr(null)
    startTransition(async () => {
      try {
        await acceptDocumentAction(txId)
        reset()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error.')
      }
    })
  }
  const doEdit = () => {
    setErr(null)
    startTransition(async () => {
      try {
        await requestEditAction(txId, editComment)
        reset()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error.')
      }
    })
  }
  const doDispute = () => {
    setErr(null)
    startTransition(async () => {
      try {
        await openDocumentDisputeAction(txId, disputePoint, disputeComment)
        reset()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error.')
      }
    })
  }

  return (
    <div className="mt-4 space-y-4">
      {previewUrl ? (
        <div className="bg-white border rounded overflow-hidden">
          <div className="text-xs px-3 py-2 bg-gray-50 border-b text-gray-600">
            Vista previa con watermark — la versión sin watermark se libera al aceptar.
          </div>
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-[600px] border-0"
            title="Preview del documento"
          />
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
          No se pudo cargar el preview. Recarga la página.
        </div>
      )}

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded px-3 py-2">
          {err}
        </div>
      )}

      {mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('accept')}
            className="bg-green-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-green-700"
          >
            Aceptar documento
          </button>
          <button
            type="button"
            onClick={() => setMode('edit')}
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50"
          >
            Pedir edición
          </button>
          <button
            type="button"
            onClick={() => setMode('dispute')}
            disabled={checklist.length === 0}
            className="border border-red-200 text-red-700 rounded px-4 py-2 text-sm hover:bg-red-50 disabled:opacity-50"
          >
            Rechazar (disputa)
          </button>
        </div>
      )}

      {mode === 'accept' && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <div className="font-medium text-sm mb-1">Confirmar aceptación</div>
          <p className="text-sm text-gray-700 mb-3">
            Al aceptar, los fondos se liberan al vendedor (modo demo) y podrás
            descargar el documento sin watermark.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={doAccept}
              disabled={isPending}
              className="bg-green-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? 'Procesando…' : 'Sí, aceptar'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="border rounded px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <div className="bg-white border rounded p-4 space-y-3">
          <div className="font-medium text-sm">Pedir edición al vendedor</div>
          <p className="text-xs text-gray-600">
            Describe qué necesitas que cambie. El vendedor recibirá tu nota y
            podrá subir una nueva versión.
          </p>
          <textarea
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Ej. La fecha del documento debe ser posterior a 2024."
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={doEdit}
              disabled={isPending || editComment.trim().length === 0}
              className="bg-black text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? 'Enviando…' : 'Pedir edición'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="border rounded px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mode === 'dispute' && (
        <div className="bg-white border rounded p-4 space-y-3">
          <div className="font-medium text-sm">Abrir disputa</div>
          <p className="text-xs text-gray-600">
            Selecciona el punto de la lista que el documento NO cumple y
            describe por qué. Una IA imparcial evaluará el caso (Fase 4).
          </p>

          <label className="block">
            <span className="text-xs text-gray-700">Punto incumplido</span>
            <select
              value={disputePoint}
              onChange={(e) => setDisputePoint(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 text-sm bg-white"
            >
              {checklist.map((it, idx) => (
                <option key={it.id} value={it.id}>
                  {idx + 1}. {it.text}
                </option>
              ))}
            </select>
          </label>

          <textarea
            value={disputeComment}
            onChange={(e) => setDisputeComment(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Explica con detalle por qué el documento no cumple ese punto."
            className="w-full border rounded px-3 py-2 text-sm"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={doDispute}
              disabled={isPending || disputeComment.trim().length === 0}
              className="bg-red-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Abriendo…' : 'Abrir disputa'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="border rounded px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
