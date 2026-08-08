/**
 * CodeGuardian AI - Code Suggestion Provider
 * 
 * Provides AI-powered inline code suggestions for all supported languages.
 * Shows "next best code lines" as ghost text in the editor.
 * Features:
 *   - Multi-line completions (1-3 lines)
 *   - Language-aware context extraction
 *   - Smart triggering (only after meaningful pauses)
 *   - Branded ghost text so users know it's from CodeGuardian
 */

import * as vscode from 'vscode';
import { AIService } from '../services/aiService';
import { ResponseCache } from '../utils/cache';
import { Logger } from '../utils/logger';

export class CodeSuggestionProvider implements vscode.InlineCompletionItemProvider {
    private aiService: AIService;
    private cache: ResponseCache;
    private logger: Logger;
    private lastRequestTime: number = 0;
    private readonly MIN_REQUEST_INTERVAL = 2500; // 2.5s minimum between requests
    private isRequesting: boolean = false;

    constructor(aiService: AIService, cache: ResponseCache) {
        this.aiService = aiService;
        this.cache = cache;
        this.logger = Logger.getInstance();
    }

    /**
     * Provide inline completion items (ghost text suggestions).
     */
    public async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | undefined> {
        // Rate limit requests
        if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
            const now = Date.now();
            if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
                return undefined;
            }
        }

        // Prevent concurrent requests
        if (this.isRequesting) {
            return undefined;
        }

        // Get current line context
        const currentLine = document.lineAt(position.line).text;
        const textBeforeCursor = currentLine.substring(0, position.character).trim();

        // Don't trigger on empty files or very short context
        if (position.line === 0 && textBeforeCursor.length < 3) {
            return undefined;
        }

        // Skip pure comment lines (but allow mid-code completions)
        if (this.isPureCommentLine(textBeforeCursor, document.languageId)) {
            return undefined;
        }

        // Build context window — include more lines for better predictions
        const contextStartLine = Math.max(0, position.line - 50);
        const contextRange = new vscode.Range(
            new vscode.Position(contextStartLine, 0),
            position
        );
        const codeContext = document.getText(contextRange);

        // Also include some lines AFTER cursor for better context
        const afterCursorEnd = Math.min(document.lineCount - 1, position.line + 10);
        const afterRange = new vscode.Range(
            new vscode.Position(position.line + 1, 0),
            new vscode.Position(afterCursorEnd, document.lineAt(afterCursorEnd).text.length)
        );
        const afterContext = position.line < document.lineCount - 1
            ? document.getText(afterRange)
            : '';

        // Check cache first
        const cacheKey = `inline:${document.languageId}:${codeContext.slice(-400)}`;
        const cached = this.cache.get(cacheKey);
        if (cached?.suggestion) {
            return this.buildCompletionItems(cached.suggestion, position);
        }

        if (token.isCancellationRequested) {
            return undefined;
        }

        try {
            this.isRequesting = true;
            this.lastRequestTime = Date.now();

            const fullContext = afterContext
                ? `${codeContext}\n/* CURSOR IS HERE */\n${afterContext}`
                : codeContext;

            const response = await this.aiService.suggestNextLine(
                fullContext,
                document.languageId
            );

            if (token.isCancellationRequested) {
                return undefined;
            }

            if (response.suggestion) {
                this.cache.set(cacheKey, response);
                const suggestion = response.suggestion.trim();
                if (suggestion) {
                    return this.buildCompletionItems(suggestion, position);
                }
            }
        } catch (error: any) {
            this.logger.warn(`Inline suggestion failed: ${error.message}`);
        } finally {
            this.isRequesting = false;
        }

        return undefined;
    }

    /**
     * Build completion items from the suggestion text.
     * Supports multi-line suggestions.
     */
    private buildCompletionItems(
        suggestion: string,
        position: vscode.Position
    ): vscode.InlineCompletionItem[] {
        // Clean the suggestion — remove leading/trailing markdown artifacts
        let cleaned = suggestion
            .replace(/^```\w*\n?/g, '')
            .replace(/\n?```$/g, '')
            .trim();

        if (!cleaned) {
            return [];
        }

        return [
            new vscode.InlineCompletionItem(
                cleaned,
                new vscode.Range(position, position)
            ),
        ];
    }

    /**
     * Detect if the line is a pure comment (not code with inline comment).
     */
    private isPureCommentLine(line: string, lang: string): boolean {
        if (!line) { return true; }
        switch (lang) {
            case 'python':
                return line.startsWith('#');
            case 'html':
                return line.startsWith('<!--');
            case 'css':
                return line.startsWith('/*') || line.startsWith('*');
            default:
                return line.startsWith('//') || line.startsWith('/*') || line.startsWith('*');
        }
    }
}
