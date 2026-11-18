import axios from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiErrorResponse } from '@/types';

export interface ParsedApiError {
  status?: number;
  message: string;
  fieldErrors: Record<string, string[]>;
  isNetworkError: boolean;
  isValidationError: boolean;
  isUnauthorized: boolean;
  isForbidden: boolean;
  isNotFound: boolean;
}

export function parseApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): ParsedApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const fieldErrors = data?.errors ?? {};

    let message = data?.message || error.message || fallback;

    if (!error.response) {
      message = 'Network error. Please check your connection and verify the API server is running.';
    } else if (status === 422 && Object.keys(fieldErrors).length > 0 && !data?.message) {
      const firstField = Object.values(fieldErrors)[0];
      if (firstField?.[0]) {
        message = firstField[0];
      }
    }

    return {
      status,
      message,
      fieldErrors,
      isNetworkError: !error.response,
      isValidationError: status === 422,
      isUnauthorized: status === 401,
      isForbidden: status === 403,
      isNotFound: status === 404,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallback,
      fieldErrors: {},
      isNetworkError: false,
      isValidationError: false,
      isUnauthorized: false,
      isForbidden: false,
      isNotFound: false,
    };
  }

  return {
    message: fallback,
    fieldErrors: {},
    isNetworkError: false,
    isValidationError: false,
    isUnauthorized: false,
    isForbidden: false,
    isNotFound: false,
  };
}

export function applyLaravelFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>
): ParsedApiError {
  const parsed = parseApiError(error);
  for (const [field, messages] of Object.entries(parsed.fieldErrors)) {
    if (messages && messages.length > 0) {
      setError(field as Path<T>, {
        type: 'server',
        message: messages[0],
      });
    }
  }
  return parsed;
}
