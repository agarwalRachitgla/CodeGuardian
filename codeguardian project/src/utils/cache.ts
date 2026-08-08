/**
 * CodeGuardian AI - Response Cache
 * 
 * LRU cache for AI responses to avoid repeated API calls
 * for the same code snippets.
 */

import * as vscode from 'vscode';

interface CacheEntry {
    value: any;
    timestamp: number;
}

export class ResponseCache {
    private cache: Map<string, CacheEntry>;
    private maxSize: number;
    private ttl: number; // Time to live in milliseconds

    constructor(maxSize?: number, ttlMinutes: number = 30) {
        const config = vscode.workspace.getConfiguration('codeguardian');
        this.maxSize = maxSize || config.get<number>('maxCacheSize', 50);
        this.ttl = ttlMinutes * 60 * 1000;
        this.cache = new Map();
    }

    /**
     * Get a cached response by key.
     */
    public get(key: string): any | undefined {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }

        // Check TTL
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return undefined;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    /**
     * Set a cached response.
     */
    public set(key: string, value: any): void {
        // Remove oldest entry if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
    }

    /**
     * Check if a key exists in the cache.
     */
    public has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    /**
     * Clear the entire cache.
     */
    public clear(): void {
        this.cache.clear();
    }

    /**
     * Get current cache size.
     */
    public get size(): number {
        return this.cache.size;
    }
}
