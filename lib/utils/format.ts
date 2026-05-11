import type { TransactionStatus, TransactionType } from '@/lib/supabase/types'

export function formatCurrency(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(n)
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  // legacy
  esperando_pago: 'Esperando pago',
  pendiente_entrega: 'Pendiente entrega',
  en_revision: 'En revisión',
  completado: 'Completado',
  en_disputa: 'En disputa',
  // v2
  borrador_lista: 'Borrador de lista',
  negociando_lista: 'Negociando lista',
  lista_acordada: 'Lista acordada',
  pagada: 'Pagada',
  entregada: 'Entregada',
  en_edicion: 'En edición',
  completada: 'Completada',
  reembolsada: 'Reembolsada',
}

export const STATUS_COLORS: Record<TransactionStatus, string> = {
  // legacy
  esperando_pago: 'bg-yellow-100 text-yellow-800',
  pendiente_entrega: 'bg-blue-100 text-blue-800',
  en_revision: 'bg-purple-100 text-purple-800',
  completado: 'bg-green-100 text-green-800',
  en_disputa: 'bg-red-100 text-red-800',
  // v2
  borrador_lista: 'bg-gray-100 text-gray-800',
  negociando_lista: 'bg-yellow-100 text-yellow-800',
  lista_acordada: 'bg-blue-100 text-blue-800',
  pagada: 'bg-blue-100 text-blue-900',
  entregada: 'bg-purple-100 text-purple-800',
  en_edicion: 'bg-yellow-100 text-yellow-900',
  completada: 'bg-green-100 text-green-800',
  reembolsada: 'bg-red-100 text-red-800',
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  boleto: 'Boleto',
  documento: 'Documento',
  objeto: 'Objeto',
}
