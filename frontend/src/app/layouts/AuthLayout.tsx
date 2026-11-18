import { Link, Outlet } from 'react-router-dom';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'ATELIER';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
              A
            </span>
            <span>{APP_NAME}</span>
          </Link>
          <Link to="/products" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to Storefront
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
