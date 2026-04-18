import { apiFetch, getApiBaseUrl } from './api-client';

interface LoginResponseDto {
  token: string;
  type: string;
  login: string;
  role: string;
}

export class AuthApi {
  private readonly baseUrl: string;

  constructor(baseUrl: string = getApiBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public async login(login: string, password: string): Promise<LoginResponseDto> {
    const response = await apiFetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ login, password })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    return await response.json() as LoginResponseDto;
  }
}
