import { CacheStrategy } from "@shared/types/enum/core.enum";

export interface ICachedResource<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
    strategy?: CacheStrategy;
    key?: string;
}

export interface ICacheOptions {
    ttl?: number;
    strategy?: CacheStrategy;
}

export interface ICacheStats {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    defaultStrategy: CacheStrategy;
}