import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/auth/useAuth'
import { formatDate } from '@/lib/utils'

export function ProfilePage() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  if (!user) return null

  async function onLogout() {
    await logout()
    toast.info('You are logged out.')
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <h1 className="font-display text-3xl font-semibold text-navy">My account</h1>

      <Card>
        <CardHeader
          title="Details"
          action={<Badge tone={isAdmin ? 'navy' : 'sage'}>{user.role}</Badge>}
        />
        <CardBody className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">Name</span>
            <span className="font-medium">
              {user.first_name} {user.last_name}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Member since</span>
            <span className="font-medium">{formatDate(user.created_at)}</span>
          </div>
        </CardBody>
      </Card>

      <Button variant="ghost" onClick={onLogout}>
        Log out
      </Button>
    </div>
  )
}
