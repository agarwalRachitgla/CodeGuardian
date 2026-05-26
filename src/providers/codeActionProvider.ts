/**
 * CodeGuardian AI - CodeAction Provider
 * 
 * Provides Quick Fix code actions for diagnostics reported by
 * the bug detector, with AI-powered fix suggestions.
 */

import * as vscode from 'vscode';
import { AIService } from '../services/aiService';
import { ResponseCache } from '../utils/cache';
import { Logger } from '../utils/logger';

export class CodeGuardianCodeActionProvider implements vscode.CodeActionProvider {
    private aiService: AIService;
    private cache: ResponseCache;
    private logger: Logger;

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    constructor(aiService: AIService, cache: ResponseCache) {
        this.aiService = aiService;
        this.cache = cache;
        this.logger = Logger.getInstance();
    }

    /**
     * Provide code actions for the given document and range.
     */
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        // Process each CodeGuardian diagnostic
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== 'CodeGuardian AI') {
                continue;
            }

            // Create quick fix from pre-computed fix data
            const fix = (diagnostic as any).codeGuardianFix;
            if (fix) {
                const quickFix = this.createQuickFix(document, diagnostic, fix);
                if (quickFix) {
                    actions.push(quickFix);
                }
            }

            // Create "Explain with AI" action
            const explainAction = this.createExplainAction(document, diagnostic);
            actions.push(explainAction);

            // Create "Fix with AI" action
            const fixAction = this.createAIFixAction(document, diagnostic);
            actions.push(fixAction);
        }

        return actions;
    }

    /**
     * Create a quick fix code action from pattern-based detection.
     */
    private createQuickFix(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic,
        fix: { search: string; replace: string }
    ): vscode.CodeAction | null {
        const matchedText = (diagnostic as any).codeGuardianMatchedText;
        if (!matchedText) {
            return null;
        }

        const action = new vscode.CodeAction(
            `🛡️ Fix: Replace "${fix.search}" with "${fix.replace}"`,
            vscode.CodeActionKind.QuickFix
        );

        action.diagnostics = [diagnostic];
        action.isPreferred = true;

        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            diagnostic.range,
            document.getText(diagnostic.range).replace(fix.search, fix.replace)
        );
        action.edit = edit;

        return action;
    }

    /**
     * Create an "Explain with AI" code action.
     */
    private createExplainAction(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            '🛡️ CodeGuardian: Explain this issue with AI',
            vscode.CodeActionKind.QuickFix
        );

        action.diagnostics = [diagnostic];

        // Get surrounding context (5 lines around the issue)
        const startLine = Math.max(0, diagnostic.range.start.line - 2);
        const endLine = Math.min(document.lineCount - 1, diagnostic.range.end.line + 2);
        const contextRange = new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(endLine, document.lineAt(endLine).text.length)
        );

        action.command = {
            command: 'codeguardian.explainCode',
            title: 'Explain with CodeGuardian AI',
        };

        return action;
    }

    /**
     * Create a "Fix with AI" code action.
     */
    private createAIFixAction(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            '🛡️ CodeGuardian: Fix with AI',
            vscode.CodeActionKind.QuickFix
        );

        action.diagnostics = [diagnostic];

        action.command = {
            command: 'codeguardian.fixCode',
            title: 'Fix with CodeGuardian AI',
        };

        return action;
    }
}
