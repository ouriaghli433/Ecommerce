import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/auth/useAuth'

/**
 * Creating an account always creates a CUSTOMER. The backend ignores any
 * role sent here, so the form does not offer one.
 */
export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setMessage(null)

    try {
      const user = await register(form)

      toast.success(`Welcome, ${user.first_name}.`)
      navigate('/', { replace: true })
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
      <h1 className="font-display text-3xl font-semibold text-navy">Create your account</h1>
      <p className="mt-2 text-sm text-muted">It takes less than a minute.</p>

      <Card className="mt-6">
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {message && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                value={form.first_name}
                onChange={(event) => update('first_name', event.target.value)}
                error={errors.first_name}
                required
              />
              <Input
                label="Last name"
                value={form.last_name}
                onChange={(event) => update('last_name', event.target.value)}
                error={errors.last_name}
                required
              />
            </div>

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters."
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              error={errors.password}
              required
            />

            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={(event) => update('password_confirmation', event.target.value)}
              required
            />

            <Button type="submit" loading={submitting} className="w-full">
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-navy underline">
              Log in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
