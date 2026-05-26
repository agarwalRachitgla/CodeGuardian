/**
 * CodeGuardian AI - Local Storage Service
 * 
 * Replaces Supabase with a local JSON-based storage system.
 * Zero configuration, zero API keys, works offline, free forever.
 * 
 * Data is stored in VS Code's globalStorage directory:
 *   ~/.vscode/globalStorage/codeguardian-ai/bug_history.json
 * 
 * Features:
 *   - Persists across sessions
 *   - Auto-prunes to keep last 200 entries
 *   - No network dependency
 *   - Instant reads/writes
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BugHistoryEntry } from '../types';
import { Logger } from '../utils/logger';

const MAX_ENTRIES = 200;
const HISTORY_FILE = 'bug_history.json';
const STATS_FILE = 'session_stats.json';

interface StoredEntry extends BugHistoryEntry {
    id: string;
    created_at: string;
}

interface SessionStats {
    totalBugsDetected: number;
    totalFixesApplied: number;
    totalExplanations: number;
    totalSuggestions: number;
    sessionsCount: number;
    firstUsed: string;
    lastUsed: string;
    languageBreakdown: Record<string, number>;
}

export class LocalStorageService {
    private storagePath: string;
    private historyPath: string;
    private statsPath: string;
    private logger: Logger;
    private cache: StoredEntry[] | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.storagePath = context.globalStorageUri.fsPath;
        this.historyPath = path.join(this.storagePath, HISTORY_FILE);
        this.statsPath = path.join(this.storagePath, STATS_FILE);
        this.logger = Logger.getInstance();

        // Ensure storage directory exists
        this.ensureDir();
    }

    private ensureDir(): void {
        try {
            if (!fs.existsSync(this.storagePath)) {
                fs.mkdirSync(this.storagePath, { recursive: true });
                this.logger.info(`Created storage directory: ${this.storagePath}`);
            }
        } catch (err: any) {
            this.logger.warn(`Failed to create storage dir: ${err.message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  Bug History
    // ═══════════════════════════════════════════════════════════════

    /**
     * Log a query to local storage.
     */
    public async logQuery(
        queryType: 'explain' | 'fix' | 'suggest',
        codeSnippet: string,
        aiResponse: any,
        language?: string
    ): Promise<void> {
        try {
            const entry: StoredEntry = {
                id: this.generateId(),
                created_at: new Date().toISOString(),
                query_type: queryType,
                code_snippet: codeSnippet.substring(0, 2000),
                ai_response: JSON.stringify(aiResponse).substring(0, 5000),
                language: language || 'unknown',
                bug_category: aiResponse.category || 'general',
            };

            const entries = this.readHistory();
            entries.unshift(entry); // Add to front (newest first)

            // Prune to max size
            if (entries.length > MAX_ENTRIES) {
                entries.length = MAX_ENTRIES;
            }

            this.writeHistory(entries);
            this.updateStats(queryType, language);
            this.logger.info(`Logged ${queryType} query to local storage`);
        } catch (error: any) {
            this.logger.warn(`Failed to log query: ${error.message}`);
        }
    }

    /**
     * Get recent bug history.
     */
    public async getRecentHistory(limit: number = 20): Promise<StoredEntry[]> {
        try {
            const entries = this.readHistory();
            return entries.slice(0, limit);
        } catch (error: any) {
            this.logger.warn(`Failed to read history: ${error.message}`);
            return [];
        }
    }

    /**
     * Get total count of entries.
     */
    public getEntryCount(): number {
        try {
            return this.readHistory().length;
        } catch {
            return 0;
        }
    }

    /**
     * Clear all history.
     */
    public clearHistory(): void {
        try {
            this.writeHistory([]);
            this.cache = null;
            this.logger.info('Bug history cleared');
        } catch (err: any) {
            this.logger.warn(`Failed to clear history: ${err.message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  Session Stats
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get cumulative session statistics.
     */
    public getStats(): SessionStats {
        try {
            if (fs.existsSync(this.statsPath)) {
                const raw = fs.readFileSync(this.statsPath, 'utf-8');
                return JSON.parse(raw);
            }
        } catch { /* ignore */ }

        return {
            totalBugsDetected: 0,
            totalFixesApplied: 0,
            totalExplanations: 0,
            totalSuggestions: 0,
            sessionsCount: 0,
            firstUsed: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            languageBreakdown: {},
        };
    }

    /**
     * Increment session count (called on extension activation).
     */
    public recordSessionStart(): void {
        try {
            const stats = this.getStats();
            stats.sessionsCount++;
            stats.lastUsed = new Date().toISOString();
            this.writeStats(stats);
        } catch { /* non-critical */ }
    }

    /**
     * Record a detected bug.
     */
    public recordBugDetected(language: string): void {
        try {
            const stats = this.getStats();
            stats.totalBugsDetected++;
            stats.languageBreakdown[language] = (stats.languageBreakdown[language] || 0) + 1;
            this.writeStats(stats);
        } catch { /* non-critical */ }
    }

    private updateStats(queryType: string, language?: string): void {
        try {
            const stats = this.getStats();
            if (queryType === 'explain') { stats.totalExplanations++; }
            if (queryType === 'fix') { stats.totalFixesApplied++; }
            if (queryType === 'suggest') { stats.totalSuggestions++; }
            stats.lastUsed = new Date().toISOString();
            if (language) {
                stats.languageBreakdown[language] = (stats.languageBreakdown[language] || 0) + 1;
            }
            this.writeStats(stats);
        } catch { /* non-critical */ }
    }

    // ═══════════════════════════════════════════════════════════════
    //  File I/O with caching
    // ═══════════════════════════════════════════════════════════════

    private readHistory(): StoredEntry[] {
        if (this.cache) { return this.cache; }

        try {
            if (fs.existsSync(this.historyPath)) {
                const raw = fs.readFileSync(this.historyPath, 'utf-8');
                this.cache = JSON.parse(raw);
                return this.cache!;
            }
        } catch (err: any) {
            this.logger.warn(`Corrupted history file, resetting: ${err.message}`);
        }

        this.cache = [];
        return this.cache;
    }

    private writeHistory(entries: StoredEntry[]): void {
        try {
            fs.writeFileSync(this.historyPath, JSON.stringify(entries, null, 2), 'utf-8');
            this.cache = entries;
        } catch (err: any) {
            this.logger.error(`Failed to write history: ${err.message}`);
        }
    }

    private writeStats(stats: SessionStats): void {
        try {
            fs.writeFileSync(this.statsPath, JSON.stringify(stats, null, 2), 'utf-8');
        } catch (err: any) {
            this.logger.error(`Failed to write stats: ${err.message}`);
        }
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Check if the storage is working (always true for local).
     */
    public isAvailable(): boolean {
        try {
            this.ensureDir();
            return fs.existsSync(this.storagePath);
        } catch {
            return false;
        }
    }

    /**
     * Get storage path info for health check display.
     */
    public getStorageInfo(): { path: string; entries: number } {
        return {
            path: this.storagePath,
            entries: this.getEntryCount(),
        };
    }
}
