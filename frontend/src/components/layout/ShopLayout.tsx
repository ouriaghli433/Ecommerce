import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

/**
 * The frame around every customer page: navigation, the page itself, footer.
 * <Outlet /> is where React Router puts the current page.
 */
export function ShopLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
