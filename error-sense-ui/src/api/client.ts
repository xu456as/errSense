const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:9090/api';
let authToken: string | null = null;

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

function buildUrl(path: string, params?: Record<string, string>) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

export function setApiToken(token: string | null) {
  authToken = token;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  const { params, ...requestOptions } = options;

  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path, params), {
    ...requestOptions,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
