import { AppError } from './app-error';

export class NetworkError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 'NETWORK_ERROR', details);
    }
}