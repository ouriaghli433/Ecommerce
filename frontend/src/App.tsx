/**
 * Temporary page: it only proves that the frontend runs in Docker and can
 * reach the Laravel API. The real application replaces it in the next step.
 */
import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [productCount, setProductCount] = useState(0)

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then((response) => {
        if (!response.ok) throw new Error('API error')
        return response.json()
      })
      .then((body) => {
        setProductCount(body.meta?.total ?? body.data?.length ?? 0)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Frontend setup</p>
      <h1 className="font-display text-4xl font-semibold">Verdant</h1>

      <div className="rounded-card bg-white p-6 shadow-card">
        {status === 'loading' && <p className="text-muted">Contacting the API…</p>}

        {status === 'ok' && (
          <p>
            Connected to the API. <span className="font-semibold">{productCount}</span> product(s)
            found.
          </p>
        )}

        {status === 'error' && (
          <p className="text-navy">
            The API did not answer. Check that the backend is running on{' '}
            <code className="rounded bg-sage-soft px-1">{API_URL}</code>.
          </p>
        )}
      </div>
    </main>
  )
}
