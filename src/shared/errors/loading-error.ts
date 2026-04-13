import { AppError } from './app-error';

export class LoadingError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 'LOADING_ERROR', details);
    }
}