/**
 * CodeGuardian AI - Supabase Service
 * 
 * Optional service for storing bug history and user queries
 * in a Supabase database for analytics and tracking.
 */

import * as https from 'https';
import { BugHistoryEntry } from '../types';
import { Logger } from '../utils/logger';

export class SupabaseService {
    private url: string;
    private anonKey: string;
    private logger: Logger;

    constructor(url: string, anonKey: string) {
        this.url = url.replace(/\/$/, ''); // Remove trailing slash
        this.anonKey = anonKey;
        this.logger = Logger.getInstance();
    }

    /**
     * Log a query (explain/fix/suggest) to Supabase for history tracking.
     */
    public async logQuery(
        queryType: 'explain' | 'fix' | 'suggest',
        codeSnippet: string,
        aiResponse: any
    ): Promise<void> {
        try {
            const entry: BugHistoryEntry = {
                query_type: queryType,
                code_snippet: codeSnippet.substring(0, 2000), // Limit size
                ai_response: JSON.stringify(aiResponse).substring(0, 5000),
                language: 'javascript/typescript',
                bug_category: aiResponse.category || 'general',
            };

            await this.insertRecord('bug_history', entry);
            this.logger.info(`Logged ${queryType} query to Supabase`);
        } catch (error: any) {
            // Non-critical - don't throw, just log
            this.logger.warn(`Failed to log query to Supabase: ${error.message}`);
        }
    }

    /**
     * Fetch recent bug history from Supabase.
     */
    public async getRecentHistory(limit: number = 20): Promise<BugHistoryEntry[]> {
        try {
            const data = await this.queryRecords('bug_history', {
                select: '*',
                order: 'created_at.desc',
                limit,
            });
            return data as BugHistoryEntry[];
        } catch (error: any) {
            this.logger.warn(`Failed to fetch history: ${error.message}`);
            return [];
        }
    }

    /**
     * Insert a record into a Supabase table.
     */
    private async insertRecord(table: string, data: Record<string, any>): Promise<any> {
        const parsedUrl = new URL(this.url);

        return new Promise((resolve, reject) => {
            const body = JSON.stringify(data);

            const req = https.request(
                {
                    hostname: parsedUrl.hostname,
                    path: `/rest/v1/${table}`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.anonKey,
                        'Authorization': `Bearer ${this.anonKey}`,
                        'Prefer': 'return=minimal',
                        'Content-Length': Buffer.byteLength(body),
                    },
                },
                (res) => {
                    let responseData = '';
                    res.on('data', (chunk) => { responseData += chunk; });
                    res.on('end', () => {
                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(`Supabase insert failed: HTTP ${res.statusCode}`));
                        } else {
                            resolve(responseData ? JSON.parse(responseData) : null);
                        }
                    });
                }
            );

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Supabase request timed out'));
            });
            req.write(body);
            req.end();
        });
    }

    /**
     * Query records from a Supabase table.
     */
    private async queryRecords(
        table: string,
        options: { select: string; order?: string; limit?: number }
    ): Promise<any[]> {
        const parsedUrl = new URL(this.url);
        let path = `/rest/v1/${table}?select=${options.select}`;
        if (options.order) {
            path += `&order=${options.order}`;
        }
        if (options.limit) {
            path += `&limit=${options.limit}`;
        }

        return new Promise((resolve, reject) => {
            const req = https.request(
                {
                    hostname: parsedUrl.hostname,
                    path,
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.anonKey,
                        'Authorization': `Bearer ${this.anonKey}`,
                    },
                },
                (res) => {
                    let responseData = '';
                    res.on('data', (chunk) => { responseData += chunk; });
                    res.on('end', () => {
                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(`Supabase query failed: HTTP ${res.statusCode}`));
                        } else {
                            try {
                                resolve(JSON.parse(responseData));
                            } catch {
                                resolve([]);
                            }
                        }
                    });
                }
            );

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Supabase request timed out'));
            });
            req.end();
        });
    }

    /**
     * Returns the SQL to create the bug_history table in Supabase.
     */
    public static getTableCreationSQL(): string {
        return `
-- Create the bug_history table for CodeGuardian AI
CREATE TABLE IF NOT EXISTS bug_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    query_type TEXT NOT NULL CHECK (query_type IN ('explain', 'fix', 'suggest')),
    code_snippet TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    language TEXT DEFAULT 'javascript/typescript',
    bug_category TEXT DEFAULT 'general'
);

-- Enable Row Level Security
ALTER TABLE bug_history ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts from anonymous users
CREATE POLICY "Allow anonymous inserts" ON bug_history
    FOR INSERT WITH CHECK (true);

-- Create a policy to allow reads from anonymous users
CREATE POLICY "Allow anonymous reads" ON bug_history
    FOR SELECT USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bug_history_created_at 
    ON bug_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bug_history_query_type 
    ON bug_history (query_type);
        `.trim();
    }
}
