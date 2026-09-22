import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { parseApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/auth/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(
    searchParams.get('expired') ? 'Your session has expired. Please log in again.' : null,
  )
  const [submitting, setSubmitting] = useState(false)

  // Where the visitor wanted to go before being sent here.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setMessage(null)

    try {
      const user = await login(email, password)

      toast.success(`Welcome back, ${user.first_name}.`)
      navigate(user.role === 'admin' ? '/admin' : from, { replace: true })
    } catch (error) {
      const info = parseApiError(error)

      setErrors(info.fieldErrors)
      setMessage(info.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="font-display text-3xl font-semibold text-navy">Log in</h1>
      <p className="mt-2 text-sm text-muted">Good to see you again.</p>

      <Card className="mt-6">
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {message && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>
            )}

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errors.password}
              required
            />

            <Button type="submit" loading={submitting} className="w-full">
              Log in
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            No account yet?{' '}
            <Link to="/register" className="font-medium text-navy underline">
              Create one
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
