import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/Container";
import { Logger } from "@core/logger/Logger";
import { ICachedResource, ICacheOptions, ICacheStats } from "@shared/types";
import { CacheStrategy } from "@shared/types/enum";

/**
 * Кэш ресурсов
 * Поддерживает разные стратегии кэширования: память, localStorage, TTL
 */
@injectable()
export class ResourceCache {
    private memoryCache: Map<string, ICachedResource<any>> = new Map();
    private logger: Logger;
    private hits: number = 0;
    private misses: number = 0;
    private maxSize: number = 100;
    private defaultTTL: number = 5 * 60 * 1000;
    private defaultStrategy: CacheStrategy = CacheStrategy.MEMORY;

    constructor(@inject(TYPES.Logger) logger: Logger) {
        this.logger = logger.getLogger('ResourceCache');
        this.loadPersistentCache();
    }

    private loadPersistentCache(): void {
        try {
            const saved = localStorage.getItem('app_cache');
            if (saved) {
                const parsed = JSON.parse(saved);
                const now = Date.now();
                let loaded = 0;
                
                for (const [key, value] of Object.entries(parsed)) {
                    const resource = value as ICachedResource<any>;
                    if (resource.expiresAt > now) {
                        this.memoryCache.set(key, resource);
                        loaded++;
                    }
                }
                
                if (loaded > 0) {
                    this.logger.debug(`Loaded ${loaded} items from persistent cache`);
                }
            }
        } catch (error) {
            this.logger.warn('Failed to load persistent cache', error);
        }
    }

    private savePersistentCache(): void {
        try {
            const persistent: Record<string, ICachedResource<any>> = {};
            
            for (const [key, value] of this.memoryCache.entries()) {
                if (value.strategy === CacheStrategy.PERSISTENT) {
                    persistent[key] = value;
                }
            }
            
            localStorage.setItem('app_cache', JSON.stringify(persistent));
        } catch (error) {
            this.logger.warn('Failed to save persistent cache', error);
        }
    }

    public get<T>(key: string): T | null {
        const cached = this.memoryCache.get(key);
        
        if (!cached) {
            this.misses++;
            return null;
        }
        
        if (Date.now() > cached.expiresAt) {
            this.memoryCache.delete(key);
            this.misses++;
            this.logger.debug(`Cache expired: ${key}`);
            return null;
        }
        
        this.hits++;
        this.logger.debug(`Cache hit: ${key} (strategy: ${cached.strategy})`);
        return cached.data as T;
    }

    public set<T>(key: string, data: T, options?: ICacheOptions): void {
        const ttl = options?.ttl ?? this.defaultTTL;
        const strategy = options?.strategy ?? this.defaultStrategy;
        const expiresAt = Date.now() + ttl;
        
        if (strategy === CacheStrategy.NONE) {
            this.logger.debug(`Skipping cache for: ${key} (strategy: NONE)`);
            return;
        }
        
        if (this.memoryCache.size >= this.maxSize && !this.memoryCache.has(key)) {
            this.evictOldest();
        }
        
        const resource: ICachedResource<T> = {
            data,
            timestamp: Date.now(),
            expiresAt,
            strategy,
            key
        };
        
        this.memoryCache.set(key, resource);
        
        if (strategy === CacheStrategy.PERSISTENT) {
            this.savePersistentCache();
        }
        
        this.logger.debug(`Cached: ${key}, expires in ${(expiresAt - Date.now()) / 1000}s, strategy: ${strategy}`);
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp = Infinity;
        
        for (const [key, value] of this.memoryCache.entries()) {
            if (value.timestamp < oldestTimestamp) {
                oldestTimestamp = value.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.memoryCache.delete(oldestKey);
            this.logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
        }
    }

    public has(key: string): boolean {
        const cached = this.memoryCache.get(key);
        
        if (!cached) {
            return false;
        }
        
        if (Date.now() > cached.expiresAt) {
            this.memoryCache.delete(key);
            return false;
        }
        
        return true;
    }

    public delete(key: string): boolean {
        const deleted = this.memoryCache.delete(key);
        
        if (deleted) {
            this.savePersistentCache();
            this.logger.debug(`Deleted from cache: ${key}`);
        }
        
        return deleted;
    }

    public clear(): void {
        this.memoryCache.clear();
        this.hits = 0;
        this.misses = 0;
        localStorage.removeItem('app_cache');
        this.logger.info('Cache cleared');
    }

    public cleanExpired(): number {
        let cleaned = 0;
        const now = Date.now();
        
        for (const [key, value] of this.memoryCache.entries()) {
            if (now > value.expiresAt) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.savePersistentCache();
            this.logger.debug(`Cleaned ${cleaned} expired items`);
        }
        
        return cleaned;
    }

    public getStats(): ICacheStats {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
        
        this.logger.debug(`Cache stats: hits=${this.hits}, misses=${this.misses}, hitRate=${hitRate.toFixed(1)}%`);
        
        return {
            size: this.memoryCache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            defaultStrategy: this.defaultStrategy
        };
    }

    public setMaxSize(size: number): void {
        this.maxSize = size;
        
        while (this.memoryCache.size > this.maxSize) {
            this.evictOldest();
        }
        
        this.logger.debug(`Max cache size set to: ${size}`);
    }

    public setDefaultStrategy(strategy: CacheStrategy): void {
        this.defaultStrategy = strategy;
        this.logger.debug(`Default cache strategy set to: ${strategy}`);
    }

    public setDefaultTTL(ttl: number): void {
        this.defaultTTL = ttl;
        this.logger.debug(`Default TTL set to: ${ttl}ms`);
    }

    public size(): number {
        return this.memoryCache.size;
    }

    public keys(): string[] {
        return Array.from(this.memoryCache.keys());
    }
}