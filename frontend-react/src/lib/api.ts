export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors: ApiFieldError[];
  requestId?: string;
}

export class ApiError extends Error {
  code: string;
  fieldErrors: ApiFieldError[];
  requestId?: string;
  status: number;

  constructor(status: number, data: ApiErrorResponse) {
    super(data.message || 'An unexpected error occurred.');
    this.name = 'ApiError';
    this.status = status;
    this.code = data.code || 'ERROR';
    this.fieldErrors = data.fieldErrors || [];
    this.requestId = data.requestId;
  }
}

export class ApiConflictError extends ApiError {
  constructor(data: ApiErrorResponse) {
    super(409, data);
    this.name = 'ApiConflictError';
  }
}

interface CsrfToken {
  token: string;
  headerName: string;
}

let csrfPromise: Promise<CsrfToken> | null = null;
let currentCsrf: CsrfToken | null = null;

export async function fetchCsrf(forceRefresh = false): Promise<CsrfToken> {
  if (currentCsrf && !forceRefresh) {
    return currentCsrf;
  }
  if (csrfPromise && !forceRefresh) {
    return csrfPromise;
  }

  csrfPromise = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/v1/auth/csrf', {
        credentials: 'include',
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (!res.ok) {
        throw new Error(`Failed to fetch CSRF token: ${res.status}`);
      }
      const data: CsrfToken = await res.json();
      currentCsrf = data;
      return data;
    } finally {
      csrfPromise = null;
    }
  })();

  return csrfPromise;
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  // For state-changing requests, ensure CSRF token is attached
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const csrf = await fetchCsrf();
    headers.set(csrf.headerName, csrf.token);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  const signal = options.signal || controller.signal;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include',
      signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        code: 'HTTP_' + response.status,
        message: response.statusText || 'Request failed.',
        fieldErrors: [],
      };
    }

    if (response.status === 409) {
      throw new ApiConflictError(errorData);
    }
    throw new ApiError(response.status, errorData);
  }

  // Handle empty responses (like 204 No Content)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return null as T;
}

export interface UserAccount {
  id: string;
  displayName: string;
  email: string;
  role: 'EMPLOYEE' | 'TECHNICIAN' | 'ADMIN';
  active: boolean;
}

export async function loginApi(email: string, password: string): Promise<UserAccount> {
  // 1. Establish session and get initial CSRF
  const csrf = await fetchCsrf(true);

  // 2. Form-encoded POST to /api/v1/auth/login
  const body = new URLSearchParams();
  body.set('email', email);
  body.set('password', password);

  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      [csrf.headerName]: csrf.token,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    let errData: ApiErrorResponse;
    try {
      errData = await res.json();
    } catch {
      errData = {
        code: 'INVALID_CREDENTIALS',
        message: "That email or password isn't right.",
        fieldErrors: [],
      };
    }
    throw new ApiError(res.status, errData);
  }

  // 3. Rotate CSRF after login
  await fetchCsrf(true);

  // 4. Fetch current user
  return await apiRequest<UserAccount>('/api/v1/auth/me');
}

export async function logoutApi(): Promise<void> {
  const csrf = await fetchCsrf();
  try {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        [csrf.headerName]: csrf.token,
      },
    });
  } catch {
    // Ignore network errors on logout
  }
  currentCsrf = null;
  // Refresh anonymous CSRF
  await fetchCsrf(true);
}

export async function registerApi(data: {
  displayName: string;
  email: string;
  password: string;
}): Promise<UserAccount> {
  return await apiRequest<UserAccount>('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

