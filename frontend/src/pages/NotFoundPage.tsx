import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-display text-6xl font-semibold text-sage">404</p>
      <h1 className="font-display text-2xl font-semibold text-navy">This page does not exist</h1>
      <p className="max-w-sm text-sm text-muted">
        The link may be old, or the page may have moved.
      </p>
      <Link to="/">
        <Button variant="secondary">Back to the shop</Button>
      </Link>
    </div>
  )
}
