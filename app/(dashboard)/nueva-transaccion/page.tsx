import { createTransactionAction } from '../transactions-actions'

export default function NuevaTransaccionPage() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold mb-4">Nueva transacción</h1>

      <form
        action={createTransactionAction}
        className="space-y-4 bg-white p-6 rounded-lg shadow"
      >
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
            defaultValue=""
            className="mt-1 w-full border rounded px-3 py-2 bg-white"
          >
            <option value="" disabled>
              Selecciona…
            </option>
            <option value="boleto">Boleto</option>
            <option value="documento">Documento</option>
            <option value="objeto">Objeto</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Descripción (opcional)</span>
          <textarea
            name="description"
            rows={3}
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

        <button
          type="submit"
          className="w-full bg-black text-white rounded py-2 font-medium hover:bg-gray-800"
        >
          Crear transacción
        </button>
      </form>
    </div>
  )
}
