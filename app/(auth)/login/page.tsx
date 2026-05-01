import Link from 'next/link'
import { signInAction } from '../actions'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        action={signInAction}
        className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>

        <input
          name="email"
          type="email"
          required
          placeholder="email@ejemplo.com"
          className="w-full border rounded px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Contraseña"
          className="w-full border rounded px-3 py-2"
        />

        <button
          type="submit"
          className="w-full bg-black text-white rounded py-2 font-medium hover:bg-gray-800"
        >
          Entrar
        </button>

        <p className="text-sm text-center text-gray-600">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="underline">
            Registrarse
          </Link>
        </p>
      </form>
    </main>
  )
}
