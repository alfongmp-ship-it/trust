'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { signUpAction, type AuthFormState } from '../actions'

const initialState: AuthFormState = undefined

export default function RegistroPage() {
  const [state, formAction] = useFormState(signUpAction, initialState)

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        action={formAction}
        className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>

        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded px-3 py-2">
            {state.error}
          </div>
        )}

        <input
          name="full_name"
          type="text"
          required
          placeholder="Nombre completo"
          className="w-full border rounded px-3 py-2"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="email@ejemplo.com"
          className="w-full border rounded px-3 py-2"
        />
        <input
          name="phone"
          type="tel"
          required
          placeholder="Teléfono"
          className="w-full border rounded px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Contraseña (mín 6)"
          className="w-full border rounded px-3 py-2"
        />

        <SubmitButton>Registrarse</SubmitButton>

        <p className="text-sm text-center text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="underline">
            Login
          </Link>
        </p>
      </form>
    </main>
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
      {pending ? 'Registrando…' : children}
    </button>
  )
}
