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
