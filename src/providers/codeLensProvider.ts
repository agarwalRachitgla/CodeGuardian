/**
 * CodeGuardian AI - CodeLens Provider
 * 
 * Shows actionable lenses above functions/classes with:
 *  - Bug count for that function
 *  - Quick "Explain" and "Fix" actions
 *  - Branded with 🛡️ so users know it's CodeGuardian
 */

import * as vscode from 'vscode';

export class CodeGuardianCodeLensProvider implements vscode.CodeLensProvider {
    private readonly onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor(diagnosticCollection: vscode.DiagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;

        // Refresh code lenses when diagnostics change
        vscode.languages.onDidChangeDiagnostics(() => {
            this.onDidChangeCodeLensesEmitter.fire();
        });
    }

    public provideCodeLenses(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.CodeLens[] {
        const lenses: vscode.CodeLens[] = [];
        const lang = document.languageId;
        const text = document.getText();
        const lines = text.split('\n');

        // Get all CodeGuardian diagnostics for this file
        const diagnostics = this.diagnosticCollection.get(document.uri) || [];
        const cgDiags = diagnostics.filter(d => d.source === 'CodeGuardian AI');

        // Detect function/class definitions by language
        const functionRegex = this.getFunctionRegex(lang);
        if (!functionRegex) { return lenses; }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            functionRegex.lastIndex = 0;

            if (functionRegex.test(line)) {
                const range = new vscode.Range(i, 0, i, line.length);

                // Count bugs within this function's scope (simple heuristic: next 50 lines)
                const scopeEnd = Math.min(i + 50, lines.length);
                const bugsInScope = cgDiags.filter(
                    d => d.range.start.line >= i && d.range.start.line < scopeEnd
                );

                if (bugsInScope.length > 0) {
                    // Bug count lens
                    lenses.push(new vscode.CodeLens(range, {
                        title: `🛡️ CodeGuardian: ${bugsInScope.length} issue${bugsInScope.length > 1 ? 's' : ''} detected`,
                        command: 'workbench.actions.view.problems',
                        tooltip: 'Click to view all issues in Problems panel',
                    }));
                } else {
                    // Clean function lens
                    lenses.push(new vscode.CodeLens(range, {
                        title: '🛡️ CodeGuardian: ✓ No issues',
                        command: '',
                        tooltip: 'This function looks clean!',
                    }));
                }
            }
        }

        return lenses;
    }

    /**
     * Get the function/class detection regex for each language.
     */
    private getFunctionRegex(lang: string): RegExp | null {
        switch (lang) {
            case 'javascript':
            case 'typescript':
            case 'javascriptreact':
            case 'typescriptreact':
                return /^\s*(?:export\s+)?(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\(|class\s+\w+|(?:public|private|protected)\s+(?:async\s+)?\w+\s*\()/;
            case 'python':
                return /^\s*(?:def\s+\w+|class\s+\w+|async\s+def\s+\w+)/;
            case 'java':
                return /^\s*(?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)+\w+\s*\(/;
            default:
                return null;
        }
    }
}
