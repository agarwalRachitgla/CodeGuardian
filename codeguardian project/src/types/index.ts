/**
 * CodeGuardian AI - Type Definitions
 */

import * as vscode from 'vscode';

/** A bug detection pattern used by the static analyzer. */
export interface BugPattern {
    id: string;
    regex: RegExp;
    message: string;
    severity: vscode.DiagnosticSeverity;
    category: string;
    quickFix?: {
        search: string;
        replace: string;
    };
    validate?: (match: string) => boolean;
    contextCheck?: (line: string) => boolean;
}

/** A bug detected during analysis. */
export interface DetectedBug {
    id: string;
    line: number;
    column: number;
    endColumn?: number;
    message: string;
    severity: vscode.DiagnosticSeverity;
    category: string;
    matchedText: string;
    quickFix?: {
        search: string;
        replace: string;
    };
}

/** Response from the AI explain/fix endpoints. */
export interface AIResponse {
    explanation: string;
    suggestedFix: string;
    improvedCode: string;
    exampleInput?: string;
    exampleOutput?: string;
    confidence?: number;
    provider?: 'groq' | 'gemini';
}

/** Response from the AI suggest endpoint. */
export interface AISuggestionResponse {
    suggestion: string;
    confidence?: number;
    provider?: 'groq' | 'gemini';
}

/** Data passed to the Debug Panel webview. */
export interface DebugPanelData {
    type: 'explanation' | 'fix' | 'welcome' | 'suggestion';
    originalCode: string;
    explanation?: string;
    suggestedFix?: string;
    improvedCode?: string;
    exampleInput?: string;
    exampleOutput?: string;
    confidence?: number;
    provider?: string;
}

/** Supabase log entry for bug history. */
export interface BugHistoryEntry {
    id?: string;
    created_at?: string;
    query_type: 'explain' | 'fix' | 'suggest';
    code_snippet: string;
    ai_response: string;
    language: string;
    bug_category?: string;
}

/** Configuration for the extension. */
export interface ExtensionConfig {
    groqApiKey: string;
    geminiApiKey: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    enableRealTimeDetection: boolean;
    enableCodeSuggestions: boolean;
    debounceDelay: number;
    maxCacheSize: number;
}

/** Token used for AI API requests. */
export interface APIRequestOptions {
    model: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    temperature?: number;
    max_tokens?: number;
}
