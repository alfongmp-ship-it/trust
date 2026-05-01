import Link from 'next/link'
import { signUpAction } from '../actions'

export default function RegistroPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        action={signUpAction}
        className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>

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

        <button
          type="submit"
          className="w-full bg-black text-white rounded py-2 font-medium hover:bg-gray-800"
        >
          Registrarse
        </button>

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
