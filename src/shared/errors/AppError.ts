export class AppError extends Error {
    public readonly code: string;
    public readonly details?: any;

    constructor(message: string, code: string = 'APP_ERROR', details?: any) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}