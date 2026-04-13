import { AppError } from './app-error';

export class AuthError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 'AUTH_ERROR', details);
    }
}