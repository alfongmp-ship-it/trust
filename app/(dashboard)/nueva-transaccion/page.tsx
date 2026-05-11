'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  createTransactionAction,
  type CreateTxFormState,
} from '../transactions-actions'

const initialState: CreateTxFormState = undefined

type ItemDraft = { localId: number; text: string }

let nextLocalId = 1
const newItem = (text = ''): ItemDraft => ({ localId: nextLocalId++, text })

export default function NuevaTransaccionPage() {
  const [state, formAction] = useFormState(
    createTransactionAction,
    initialState,
  )
  const [items, setItems] = useState<ItemDraft[]>([newItem(), newItem()])

  const checklistPayload = JSON.stringify(
    items.map((it) => ({ text: it.text })).filter((it) => it.text.trim().length > 0),
  )

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">Nueva transacción</h1>
      <p className="text-sm text-gray-600 mb-4">
        Documenta los términos del entregable. El comprador revisará la lista
        y podrá proponer cambios antes de depositar los fondos.
      </p>

      <form
        action={formAction}
        className="space-y-5 bg-white p-6 rounded-lg shadow"
      >
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded px-3 py-2">
            {state.error}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium">Monto (MXN)</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Tipo</span>
          <select
            name="type"
            required
            defaultValue="documento"
            className="mt-1 w-full border rounded px-3 py-2 bg-white"
          >
            <option value="documento">Documento</option>
            <option value="boleto">Boleto</option>
            <option value="objeto">Objeto</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Descripción (opcional)</span>
          <textarea
            name="description"
            rows={2}
            placeholder="Ej. Escritura de la propiedad ubicada en Polanco."
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Fecha límite de entrega</span>
          <input
            name="delivery_deadline"
            type="datetime-local"
            required
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-medium">Lista de términos</span>
            <span className="text-xs text-gray-500">
              {items.filter((i) => i.text.trim()).length}/20
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Cada punto define algo que el documento entregado debe cumplir
            (ej. &quot;Firma del vendedor visible&quot;, &quot;Fecha posterior a 2024&quot;).
          </p>

          <input type="hidden" name="checklist" value={checklistPayload} />

          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={it.localId} className="flex gap-2">
                <span className="text-gray-400 text-sm w-6 text-right pt-2">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={it.text}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((p) =>
                        p.localId === it.localId ? { ...p, text: e.target.value } : p,
                      ),
                    )
                  }
                  maxLength={200}
                  placeholder="Punto que el documento debe cumplir"
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.filter((p) => p.localId !== it.localId))
                  }
                  disabled={items.length === 1}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-2"
                  aria-label="Quitar punto"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, newItem()])}
            disabled={items.length >= 20}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            + Agregar punto
          </button>
        </div>

        <SubmitButton>Crear transacción</SubmitButton>
      </form>
    </div>
  )
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-black text-white rounded py-2 font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Creando…' : children}
    </button>
  )
}
