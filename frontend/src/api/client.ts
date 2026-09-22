import axios, { AxiosError } from 'axios'

/**
 * The one place that talks to the Laravel API.
 * Components never call axios directly: they use the files next to this one
 * (products.ts, cart.ts, orders.ts...), which all use this client.
 */

export const TOKEN_KEY = 'ecommerce.token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  headers: { Accept: 'application/json' },
})

/** Reads the saved token. localStorage can throw in private mode. */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage blocked: the session will simply not survive a refresh.
  }
}

// Every request carries the Bearer token when we have one.
api.interceptors.request.use((config) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// A 401 means the token is gone or expired: forget it and go to the login
// page, unless we are already trying to log in.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''
    const isAuthCall = url.includes('/login') || url.includes('/register')

    if (status === 401 && !isAuthCall) {
      setToken(null)

      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1')
      }
    }

    return Promise.reject(error)
  },
)

export interface ApiErrorInfo {
  status?: number
  /** A sentence that can be shown to the user as it is. */
  message: string
  /** For a 422: { email: "This email is already taken." } */
  fieldErrors: Record<string, string>
}

/**
 * Turns any error into something the interface can display.
 * The backend messages are used when they exist, because they explain the
 * business rule ("Only 4 left in stock"); otherwise a general sentence per
 * status code is used.
 */
export function parseApiError(error: unknown): ApiErrorInfo {
  if (!axios.isAxiosError(error)) {
    return { message: 'Something went wrong. Please try again.', fieldErrors: {} }
  }

  const status = error.response?.status
  const data = error.response?.data as
    | { message?: string; errors?: Record<string, string[]> }
    | undefined

  const fieldErrors: Record<string, string> = {}

  for (const [field, messages] of Object.entries(data?.errors ?? {})) {
    if (messages?.[0]) fieldErrors[field] = messages[0]
  }

  if (!error.response) {
    return {
      status,
      message: 'The server is not answering. Check your connection and try again.',
      fieldErrors,
    }
  }

  const backendMessage = data?.message

  switch (status) {
    case 401:
      return { status, message: 'Your session has expired. Please log in again.', fieldErrors }
    case 403:
      return {
        status,
        message: "You don't have permission to perform this action.",
        fieldErrors,
      }
    case 404:
      return { status, message: 'The requested item was not found.', fieldErrors }
    case 409:
      // The backend explains the conflict well ("A payment is already in
      // progress for this order."), so its own message comes first.
      return {
        status,
        message:
          backendMessage ??
          'This action conflicts with the current state. Please refresh and try again.',
        fieldErrors,
      }
    case 422: {
      const firstField = Object.values(fieldErrors)[0]

      return {
        status,
        message: firstField ?? backendMessage ?? 'Please check the highlighted fields.',
        fieldErrors,
      }
    }
    case 429:
      return { status, message: 'Too many requests. Please wait a moment.', fieldErrors }
    case 502:
      return {
        status,
        message: 'The payment provider is currently unavailable. Please try again.',
        fieldErrors,
      }
    default:
      return {
        status,
        message: backendMessage ?? 'Something went wrong. Please try again.',
        fieldErrors,
      }
  }
}

/** Short version when only the sentence is needed. */
export function getErrorMessage(error: unknown): string {
  return parseApiError(error).message
}
