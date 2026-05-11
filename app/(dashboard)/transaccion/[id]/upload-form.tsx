'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { uploadDocumentAction } from '../../transactions-actions'

export function UploadForm({ txId, label }: { txId: string; label: string }) {
  const [state, formAction] = useFormState(uploadDocumentAction, undefined)

  return (
    <form action={formAction} className="mt-4 bg-white border rounded p-4 space-y-3">
      <div className="font-medium text-sm">{label}</div>
      <p className="text-xs text-gray-600">
        Sube un PDF (máx 5 MB). El sistema generará una versión con watermark
        para que el comprador la revise antes de aceptar.
      </p>

      <input type="hidden" name="transactionId" value={txId} />
      <input
        type="file"
        name="file"
        accept="application/pdf"
        required
        className="block w-full text-sm border rounded px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
      />

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded px-3 py-2">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-black text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
    >
      {pending ? 'Procesando PDF…' : 'Subir documento'}
    </button>
  )
}
