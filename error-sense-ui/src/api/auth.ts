import { apiFetch } from './client';

type LoginResponse = {
  email: string;
  token: string;
};

type LoginPayload = {
  email: string;
  password: string;
  oneTimePassword?: string;
};

export function loginWithPassword(payload: LoginPayload) {
  return apiFetch<LoginResponse>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
