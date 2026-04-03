import { AppError } from './AppError';

/**
 * Ошибка "ресурс не найден"
 */
export class NotFoundError extends AppError {
    constructor(resource: string, id?: string) {
        const message = id 
            ? `${resource} с ID "${id}" не найден`
            : `${resource} не найден`;
        super(message, 'NOT_FOUND', 404);
        this.name = 'NotFoundError';
    }
}