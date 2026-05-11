'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ChecklistItem } from '@/lib/supabase/types'

export type CreateTxFormState = { error: string } | undefined

// Acepta un array de strings o un array de {text} y devuelve items
// validados con id generado server-side. Lanza error si la lista
// queda vacía o si algún item excede 200 chars.
function parseChecklistFromForm(formData: FormData): ChecklistItem[] {
  const raw = formData.get('checklist') as string | null
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const out: ChecklistItem[] = []
  for (const it of parsed) {
    let text = ''
    if (typeof it === 'string') text = it
    else if (it && typeof it === 'object' && 'text' in it && typeof (it as { text: unknown }).text === 'string') {
      text = (it as { text: string }).text
    }
    text = text.trim()
    if (text.length === 0 || text.length > 200) continue
    out.push({ id: String(randomUUID()), text })
    if (out.length >= 20) break
  }
  return out
}

export async function createTransactionAction(
  _prevState: CreateTxFormState,
  formData: FormData,
): Promise<CreateTxFormState> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const amount = formData.get('amount') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const delivery_deadline = formData.get('delivery_deadline') as string

  const checklist = parseChecklistFromForm(formData)
  if (checklist.length === 0) {
    return { error: 'Debes agregar al menos un punto a la lista de términos.' }
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      seller_id: user.id,
      buyer_id: null,
      amount: parseFloat(amount),
      type,
      description: description?.trim() || null,
      delivery_deadline: delivery_deadline || null,
      status: 'borrador_lista',
      checklist,
      checklist_version: 1,
      checklist_last_proposed_by: 'seller',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  redirect(`/transaccion/${data.id}`)
}

export async function claimTransactionAction(transactionId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('transactions')
    .update({ buyer_id: user.id })
    .eq('id', transactionId)
    .is('buyer_id', null)
    .neq('seller_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath(`/transaccion/${transactionId}`)
  redirect(`/transaccion/${transactionId}`)
}

async function revalidateTx(transactionId: string) {
  revalidatePath('/dashboard')
  revalidatePath(`/transaccion/${transactionId}`)
}

// ============================================================
// v2 — Negociación del checklist
// ============================================================

// Cualquiera (seller o buyer) propone una nueva versión de la lista.
// Mientras el status sea {borrador_lista, negociando_lista, lista_acordada}
// se puede seguir editando (lista_acordada permite renegociar antes
// del depósito).
export async function proposeChecklistAction(
  transactionId: string,
  items: ChecklistItem[],
  expectedVersion: number,
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Sanea: regenera IDs y normaliza texto. No confío en lo que mande el cliente.
  const sanitized: ChecklistItem[] = []
  for (const it of items) {
    const text = (it?.text ?? '').trim()
    if (text.length === 0 || text.length > 200) continue
    sanitized.push({ id: String(randomUUID()), text })
    if (sanitized.length >= 20) break
  }

  if (sanitized.length === 0) {
    throw new Error('La lista debe tener al menos un punto.')
  }

  // Trae la tx para determinar el rol del user y el last_proposed_by.
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('seller_id, buyer_id, status, checklist_version')
    .eq('id', transactionId)
    .single()

  if (txErr || !tx) throw new Error('Transacción no encontrada.')
  if (tx.checklist_version !== expectedVersion) {
    throw new Error('La lista cambió. Recarga la página para ver la última versión.')
  }

  const role: 'seller' | 'buyer' | null =
    tx.seller_id === user.id ? 'seller' : tx.buyer_id === user.id ? 'buyer' : null
  if (!role) throw new Error('No puedes editar esta lista.')

  const { data, error } = await supabase
    .from('transactions')
    .update({
      checklist: sanitized,
      checklist_version: expectedVersion + 1,
      checklist_last_proposed_by: role,
      status: 'negociando_lista',
    })
    .eq('id', transactionId)
    .eq('checklist_version', expectedVersion)
    .in('status', ['borrador_lista', 'negociando_lista', 'lista_acordada'])
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('No se pudo actualizar la lista. Recarga la página.')
  }

  await revalidateTx(transactionId)
}

// La parte opuesta al "last_proposed_by" confirma la lista.
// Avanza a lista_acordada — listo para depósito.
export async function confirmChecklistAction(
  transactionId: string,
  expectedVersion: number,
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('seller_id, buyer_id, status, checklist_version, checklist_last_proposed_by')
    .eq('id', transactionId)
    .single()
  if (txErr || !tx) throw new Error('Transacción no encontrada.')

  if (tx.checklist_version !== expectedVersion) {
    throw new Error('La lista cambió. Recarga la página.')
  }
  if (!tx.buyer_id) {
    throw new Error('Se necesita que un comprador reclame la transacción antes de confirmar la lista.')
  }

  const role: 'seller' | 'buyer' | null =
    tx.seller_id === user.id ? 'seller' : tx.buyer_id === user.id ? 'buyer' : null
  if (!role) throw new Error('No participas en esta transacción.')

  // Sólo confirma la parte opuesta a la que propuso último.
  if (tx.checklist_last_proposed_by === role) {
    throw new Error('Tú propusiste la última versión. Espera a que la otra parte confirme.')
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'lista_acordada' })
    .eq('id', transactionId)
    .eq('checklist_version', expectedVersion)
    .in('status', ['borrador_lista', 'negociando_lista'])
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('No se pudo confirmar la lista. Recarga la página.')
  }

  await revalidateTx(transactionId)
}

// ============================================================
// v2 — Depósito simulado (Fase 2)
// ============================================================

// Buyer "deposita" — sólo cambia status + paid_at. En MVP no procesa
// pago real; un sticker "Modo demo" en el layout deja eso claro.
export async function simulatePaymentAction(transactionId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('transactions')
    .update({
      status: 'pagada',
      paid_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('status', 'lista_acordada')
    .eq('buyer_id', user.id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('No puedes depositar en este momento.')
  }

  await revalidateTx(transactionId)
}

// ============================================================
// v2 — Upload del documento entregado (Fase 2)
// ============================================================

// Seller sube un PDF. Server-side aplica watermark al PDF original
// con pdf-lib, guarda ambas versiones (original + watermarked) en
// el bucket 'documents', registra 2 filas en files, y avanza la tx
// a 'entregada'. Acepta también re-uploads cuando status='en_edicion'
// (incrementa version).
export async function uploadDocumentAction(
  _prevState: { error: string } | undefined,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const transactionId = formData.get('transactionId') as string
  const file = formData.get('file') as File | null

  if (!transactionId) return { error: 'Transacción inválida.' }
  if (!file || file.size === 0) return { error: 'Sube un archivo PDF.' }
  if (file.type !== 'application/pdf') return { error: 'El archivo debe ser PDF.' }
  if (file.size > 5 * 1024 * 1024) return { error: 'El PDF no debe exceder 5 MB.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Sólo el seller, sólo en estados que permiten entregar/re-entregar.
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('seller_id, status')
    .eq('id', transactionId)
    .single()
  if (txErr || !tx) return { error: 'Transacción no encontrada.' }
  if (tx.seller_id !== user.id) return { error: 'Sólo el vendedor puede subir el documento.' }
  if (tx.status !== 'pagada' && tx.status !== 'en_edicion') {
    return { error: 'No puedes entregar en este estado.' }
  }

  // Calcula la siguiente versión (count + 1) — soporta re-uploads.
  const { count: existingCount } = await supabase
    .from('files')
    .select('*', { count: 'exact', head: true })
    .eq('transaction_id', transactionId)
    .eq('kind', 'original')
  const version = (existingCount ?? 0) + 1

  // Lee bytes del PDF y aplica watermark.
  const originalBytes = new Uint8Array(await file.arrayBuffer())
  let watermarkedBytes: Uint8Array
  try {
    const { applyWatermark } = await import('@/lib/pdf/watermark')
    watermarkedBytes = await applyWatermark(originalBytes)
  } catch {
    return {
      error:
        'No se pudo procesar el PDF. Asegúrate de que no esté cifrado ni dañado.',
    }
  }

  const originalPath = `${transactionId}/v${version}/original.pdf`
  const watermarkedPath = `${transactionId}/v${version}/watermarked.pdf`

  const up1 = await supabase.storage
    .from('documents')
    .upload(originalPath, originalBytes, {
      contentType: 'application/pdf',
      upsert: false,
    })
  if (up1.error) return { error: `Upload original falló: ${up1.error.message}` }

  const up2 = await supabase.storage
    .from('documents')
    .upload(watermarkedPath, watermarkedBytes, {
      contentType: 'application/pdf',
      upsert: false,
    })
  if (up2.error) return { error: `Upload watermarked falló: ${up2.error.message}` }

  // Inserta los 2 registros y avanza el status.
  const { error: filesErr } = await supabase.from('files').insert([
    {
      transaction_id: transactionId,
      version,
      kind: 'original',
      storage_path: originalPath,
      uploaded_by: user.id,
      file_type: 'application/pdf',
    },
    {
      transaction_id: transactionId,
      version,
      kind: 'watermarked',
      storage_path: watermarkedPath,
      uploaded_by: user.id,
      file_type: 'application/pdf',
    },
  ])
  if (filesErr) return { error: `Error al guardar metadatos: ${filesErr.message}` }

  const { error: statusErr } = await supabase
    .from('transactions')
    .update({
      status: 'entregada',
      delivery_uploaded_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('seller_id', user.id)
    .in('status', ['pagada', 'en_edicion'])
  if (statusErr) return { error: `Error al actualizar status: ${statusErr.message}` }

  await revalidateTx(transactionId)
  return undefined
}

// ============================================================
// Legacy v1 — se mantienen para no romper txs viejas, pero el
// flow nuevo (documento) no las usa. Borrar en Fase 6 cuando
// se valide que ninguna tx legacy queda en producción.
// ============================================================

export async function markPaidAction(transactionId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'pendiente_entrega' })
    .eq('id', transactionId)
    .eq('status', 'esperando_pago')
    .eq('buyer_id', user.id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('No puedes confirmar el pago en este momento.')
  }

  await revalidateTx(transactionId)
}

export async function markDeliveredAction(transactionId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('transactions')
    .update({
      status: 'en_revision',
      delivered_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('status', 'pendiente_entrega')
    .eq('seller_id', user.id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('No puedes marcar como entregado en este momento.')
  }

  await revalidateTx(transactionId)
}

export async function markCompletedAction(transactionId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('transactions')
    .update({
      status: 'completado',
      release_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('status', 'en_revision')
    .eq('buyer_id', user.id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('No puedes completar la transacción en este momento.')
  }

  await revalidateTx(transactionId)
}

export async function openDisputeAction(transactionId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'en_disputa' })
    .eq('id', transactionId)
    .in('status', ['pendiente_entrega', 'en_revision'])
    .eq('buyer_id', user.id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('No puedes abrir disputa en este momento.')
  }

  await revalidateTx(transactionId)
}

export async function closeDisputeAction(transactionId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'en_revision' })
    .eq('id', transactionId)
    .eq('status', 'en_disputa')
    .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('No puedes cerrar la disputa en este momento.')
  }

  await revalidateTx(transactionId)
}
