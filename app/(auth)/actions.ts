'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthFormState = { error: string } | undefined

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, phone } },
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOutAction() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
