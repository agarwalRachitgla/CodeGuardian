/**
 * CodeGuardian AI - Decoration Provider
 * 
 * Adds visual decorations to the editor:
 *  - Colored gutter icons for detected issues
 *  - Inline end-of-line annotations showing issue category
 *  - Background highlights for critical issues (errors)
 */

import * as vscode from 'vscode';

export class DecorationProvider {
    private errorDecorationType: vscode.TextEditorDecorationType;
    private warningDecorationType: vscode.TextEditorDecorationType;
    private infoDecorationType: vscode.TextEditorDecorationType;
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor(diagnosticCollection: vscode.DiagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;

        // Error: subtle red background + red inline tag
        this.errorDecorationType = vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            backgroundColor: 'rgba(239, 68, 68, 0.06)',
            overviewRulerColor: '#ef4444',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                color: 'rgba(239, 68, 68, 0.6)',
                fontStyle: 'italic',
                fontWeight: '400',
                margin: '0 0 0 2em',
            },
        });

        // Warning: subtle amber line tag
        this.warningDecorationType = vscode.window.createTextEditorDecorationType({
            overviewRulerColor: '#eab308',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                color: 'rgba(234, 179, 8, 0.5)',
                fontStyle: 'italic',
                fontWeight: '400',
                margin: '0 0 0 2em',
            },
        });

        // Info: subtle blue tag
        this.infoDecorationType = vscode.window.createTextEditorDecorationType({
            overviewRulerColor: '#3b82f6',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                color: 'rgba(59, 130, 246, 0.4)',
                fontStyle: 'italic',
                fontWeight: '400',
                margin: '0 0 0 2em',
            },
        });
    }

    /**
     * Update decorations in the active editor based on current diagnostics.
     */
    public updateDecorations(editor: vscode.TextEditor): void {
        const uri = editor.document.uri;
        const diagnostics = this.diagnosticCollection.get(uri) || [];

        // Filter only CodeGuardian diagnostics
        const cgDiags = diagnostics.filter(d => d.source === 'CodeGuardian AI');

        const errors: vscode.DecorationOptions[] = [];
        const warnings: vscode.DecorationOptions[] = [];
        const infos: vscode.DecorationOptions[] = [];

        // Track lines we've already decorated to avoid clutter
        const decoratedLines = new Set<number>();

        for (const diag of cgDiags) {
            const line = diag.range.start.line;
            if (decoratedLines.has(line)) { continue; }
            decoratedLines.add(line);

            // Extract category from the diagnostic code
            const code = diag.code as string || 'issue';
            const shortLabel = this.getShortLabel(code);

            const decoration: vscode.DecorationOptions = {
                range: diag.range,
                renderOptions: {
                    after: {
                        contentText: `  🛡️ ${shortLabel}`,
                    },
                },
            };

            switch (diag.severity) {
                case vscode.DiagnosticSeverity.Error:
                    errors.push(decoration);
                    break;
                case vscode.DiagnosticSeverity.Warning:
                    warnings.push(decoration);
                    break;
                default:
                    infos.push(decoration);
                    break;
            }
        }

        editor.setDecorations(this.errorDecorationType, errors);
        editor.setDecorations(this.warningDecorationType, warnings);
        editor.setDecorations(this.infoDecorationType, infos);
    }

    /**
     * Clear all decorations from the editor.
     */
    public clearDecorations(editor: vscode.TextEditor): void {
        editor.setDecorations(this.errorDecorationType, []);
        editor.setDecorations(this.warningDecorationType, []);
        editor.setDecorations(this.infoDecorationType, []);
    }

    /**
     * Get a short human-readable label for the issue type.
     */
    private getShortLabel(code: string): string {
        const labels: Record<string, string> = {
            // JavaScript/TypeScript
            'loose-equality': '==  →  ===',
            'loose-inequality': '!=  →  !==',
            'console-log': 'console statement',
            'var-usage': 'var  →  const/let',
            'null-comparison': 'null check',
            'missing-await': 'missing await',
            'async-no-await': 'async unused',
            'empty-catch': 'empty catch',
            'debugger-statement': 'debugger',
            'eval-usage': 'eval() risk',
            'innerhtml-xss': 'XSS risk',
            'uncleared-interval': 'memory leak',
            'unused-variable': 'unused var',
            'unhandled-promise': 'unhandled promise',
            'magic-number': 'magic number',
            'nested-ternary': 'nested ternary',

            // Python
            'py-equality-none': '==  →  is None',
            'py-inequality-none': '!=  →  is not None',
            'py-bare-except': 'bare except',
            'py-mutable-default': 'mutable default',
            'py-print-statement': 'print()',
            'py-type-check': 'use isinstance()',
            'py-star-import': 'wildcard import',
            'py-global-keyword': 'global state',
            'py-eval': 'eval() risk',
            'py-exec': 'exec() risk',
            'py-pass-except': 'silent except',
            'py-hardcoded-password': 'hardcoded secret',
            'py-equality-true-false': 'bool compare',
            'py-breakpoint': 'breakpoint()',
            'py-pdb': 'pdb debug',
            'py-unused-import': 'unused import',

            // HTML
            'html-missing-alt': 'missing alt',
            'html-inline-style': 'inline style',
            'html-inline-script': 'inline script',
            'html-deprecated-tag': 'deprecated tag',
            'html-missing-doctype': 'no DOCTYPE',
            'html-onclick': 'inline handler',
            'html-missing-lang': 'missing lang',
            'html-empty-href': 'empty href',
            'html-http-link': 'HTTP link',

            // CSS
            'css-important': '!important',
            'css-id-selector': 'ID selector',
            'css-magic-number': 'magic number',
            'css-universal-selector': '* selector',
            'css-outline-none': 'outline:none',
            'css-float': 'use flexbox',
            'css-vendor-prefix': 'vendor prefix',
            'css-z-index-high': 'high z-index',
            'css-duplicate-property': 'duplicate prop',

            // Java
            'java-string-equals': '==  →  .equals()',
            'java-sysout': 'System.out',
            'java-syserr': 'System.err',
            'java-empty-catch': 'empty catch',
            'java-raw-type': 'raw type',
            'java-return-null': 'return null',
            'java-catch-exception': 'catch Exception',
            'java-hardcoded-string': 'hardcoded secret',
            'java-thread-sleep': 'Thread.sleep()',
            'java-finalize': 'finalize()',
        };

        return labels[code] || code;
    }

    /**
     * Dispose all decoration types.
     */
    public dispose(): void {
        this.errorDecorationType.dispose();
        this.warningDecorationType.dispose();
        this.infoDecorationType.dispose();
    }
}
