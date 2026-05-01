'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createTransactionAction(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const amount = formData.get('amount') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const delivery_deadline = formData.get('delivery_deadline') as string

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      seller_id: user.id,
      buyer_id: null,
      amount: parseFloat(amount),
      type,
      description: description?.trim() || null,
      delivery_deadline: delivery_deadline || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

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

// ============================================================
// Status transitions — cada una valida atómicamente status
// previo + rol del user en la misma query (.eq() chains).
// Si 0 rows fueron afectados → throw (status cambió under us
// o el user no tiene permiso).
// ============================================================

async function revalidateTx(transactionId: string) {
  revalidatePath('/dashboard')
  revalidatePath(`/transaccion/${transactionId}`)
}

export async function markPaidAction(transactionId: string) {
  // buyer marca pagado: esperando_pago → pendiente_entrega
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
  // seller marca entregado: pendiente_entrega → en_revision + delivered_at
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
  // buyer aprueba: en_revision → completado + release_at
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
  // buyer abre disputa: pendiente_entrega o en_revision → en_disputa
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
  // cualquier parte cierra disputa: en_disputa → en_revision
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
