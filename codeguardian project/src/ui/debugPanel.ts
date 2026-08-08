/**
 * CodeGuardian AI - Debug Panel Webview
 * 
 * Creates and manages the custom webview panel that displays
 * AI-powered bug explanations, fixes, and improved code.
 */

import * as vscode from 'vscode';
import { DebugPanelData } from '../types';

export class DebugPanelProvider {
    public static currentPanel: DebugPanelProvider | undefined;
    private static readonly viewType = 'codeguardianDebugPanel';

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            (message) => this.handleMessage(message),
            null,
            this.disposables
        );
    }

    /**
     * Create or show the debug panel with the given data.
     */
    public static createOrShow(extensionUri: vscode.Uri, data: DebugPanelData): void {
        const column = vscode.window.activeTextEditor
            ? vscode.ViewColumn.Beside
            : vscode.ViewColumn.One;

        if (DebugPanelProvider.currentPanel) {
            DebugPanelProvider.currentPanel.panel.reveal(column);
            DebugPanelProvider.currentPanel.updateContent(data);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            DebugPanelProvider.viewType,
            '🛡️ CodeGuardian AI Debugger',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri],
            }
        );

        DebugPanelProvider.currentPanel = new DebugPanelProvider(panel, extensionUri);
        DebugPanelProvider.currentPanel.updateContent(data);
    }

    /**
     * Update the panel content with new data.
     */
    private updateContent(data: DebugPanelData): void {
        this.panel.webview.html = this.getHtmlContent(data);
    }

    /**
     * Handle messages from the webview.
     */
    private handleMessage(message: any): void {
        switch (message.command) {
            case 'copyCode':
                vscode.env.clipboard.writeText(message.text).then(() => {
                    vscode.window.showInformationMessage('Code copied to clipboard!');
                });
                break;
            case 'applyFix':
                this.applyFixToEditor(message.code);
                break;
            case 'dismiss':
                this.panel.dispose();
                break;
        }
    }

    /**
     * Apply a fix directly to the active editor.
     */
    private applyFixToEditor(code: string): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor to apply fix to.');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('Please select the code you want to replace first.');
            return;
        }

        editor.edit((editBuilder) => {
            editBuilder.replace(selection, code);
        }).then((success) => {
            if (success) {
                vscode.window.showInformationMessage('🛡️ CodeGuardian: Fix applied successfully!');
            } else {
                vscode.window.showErrorMessage('Failed to apply fix.');
            }
        });
    }

    /**
     * Generate the HTML content for the webview panel.
     */
    private getHtmlContent(data: DebugPanelData): string {
        const nonce = this.getNonce();

        const escapeHtml = (str: string): string => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        const providerBadge = data.provider
            ? `<span class="provider-badge ${data.provider}">${data.provider === 'groq' ? '⚡ Groq' : '✨ Gemini'}</span>`
            : '';

        const isWelcome = data.type === 'welcome';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <title>CodeGuardian AI Debugger</title>
    <style nonce="${nonce}">
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #1c2333;
            --bg-card: #21262d;
            --border-color: #30363d;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --text-muted: #6e7681;
            --accent-blue: #58a6ff;
            --accent-green: #3fb950;
            --accent-orange: #d29922;
            --accent-red: #f85149;
            --accent-purple: #bc8cff;
            --accent-cyan: #39d2c0;
            --gradient-start: #1a1a2e;
            --gradient-end: #16213e;
            --shadow-glow: 0 0 20px rgba(88, 166, 255, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
            overflow-x: hidden;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 24px;
        }

        /* Header */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            background: linear-gradient(135deg, rgba(88, 166, 255, 0.08), rgba(188, 140, 255, 0.05));
            border: 1px solid var(--border-color);
            border-radius: 16px;
            margin-bottom: 24px;
            backdrop-filter: blur(10px);
            box-shadow: var(--shadow-glow);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .header-icon {
            font-size: 36px;
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        .header h1 {
            font-size: 22px;
            font-weight: 700;
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .header-subtitle {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 2px;
        }

        .provider-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .provider-badge.groq {
            background: linear-gradient(135deg, rgba(255, 139, 62, 0.15), rgba(255, 89, 94, 0.1));
            color: #ff8b3e;
            border: 1px solid rgba(255, 139, 62, 0.3);
        }

        .provider-badge.gemini {
            background: linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(219, 68, 55, 0.1));
            color: #4285f4;
            border: 1px solid rgba(66, 133, 244, 0.3);
        }

        /* Cards */
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
            transition: all 0.3s ease;
            animation: slideIn 0.4s ease-out;
        }

        .card:hover {
            border-color: rgba(88, 166, 255, 0.3);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(12px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .card:nth-child(2) { animation-delay: 0.1s; }
        .card:nth-child(3) { animation-delay: 0.2s; }
        .card:nth-child(4) { animation-delay: 0.3s; }
        .card:nth-child(5) { animation-delay: 0.4s; }

        .card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 18px;
            background: rgba(255, 255, 255, 0.02);
            border-bottom: 1px solid var(--border-color);
            cursor: pointer;
            user-select: none;
        }

        .card-header:hover {
            background: rgba(255, 255, 255, 0.04);
        }

        .card-icon {
            font-size: 18px;
        }

        .card-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            flex: 1;
        }

        .card-content {
            padding: 16px 18px;
        }

        .card-content p {
            color: var(--text-secondary);
            font-size: 14px;
            line-height: 1.7;
        }

        /* Severity badges */
        .severity-bug {
            border-left: 3px solid var(--accent-red);
        }

        .severity-explain {
            border-left: 3px solid var(--accent-blue);
        }

        .severity-fix {
            border-left: 3px solid var(--accent-green);
        }

        .severity-code {
            border-left: 3px solid var(--accent-purple);
        }

        .severity-example {
            border-left: 3px solid var(--accent-orange);
        }

        /* Code blocks */
        .code-block {
            position: relative;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
            margin-top: 8px;
        }

        .code-toolbar {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 6px 10px;
            background: rgba(255, 255, 255, 0.02);
            border-bottom: 1px solid var(--border-color);
        }

        .code-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .code-btn:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border-color: var(--accent-blue);
        }

        .code-btn.apply-btn:hover {
            border-color: var(--accent-green);
            color: var(--accent-green);
        }

        pre {
            margin: 0;
            padding: 16px;
            overflow-x: auto;
            font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-primary);
            tab-size: 4;
        }

        code {
            font-family: inherit;
        }

        /* Welcome screen */
        .welcome {
            text-align: center;
            padding: 60px 40px;
        }

        .welcome-icon {
            font-size: 72px;
            margin-bottom: 24px;
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        .welcome h2 {
            font-size: 24px;
            color: var(--text-primary);
            margin-bottom: 12px;
        }

        .welcome p {
            color: var(--text-secondary);
            font-size: 14px;
            max-width: 500px;
            margin: 0 auto 32px;
        }

        .shortcut-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            max-width: 500px;
            margin: 0 auto;
        }

        .shortcut-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            text-align: left;
            transition: all 0.2s ease;
        }

        .shortcut-item:hover {
            border-color: var(--accent-blue);
            transform: translateY(-2px);
        }

        .shortcut-key {
            padding: 3px 8px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 5px;
            font-family: monospace;
            font-size: 11px;
            color: var(--accent-cyan);
            white-space: nowrap;
        }

        .shortcut-label {
            font-size: 12px;
            color: var(--text-secondary);
        }

        /* Status indicator */
        .status-bar {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px;
            margin-top: 8px;
            font-size: 12px;
            color: var(--text-muted);
        }

        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--accent-green);
            animation: blink 2s ease-in-out infinite;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        ::-webkit-scrollbar-track {
            background: transparent;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--text-muted);
        }

        /* Responsive */
        @media (max-width: 600px) {
            .container { padding: 12px; }
            .shortcut-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <span class="header-icon">🛡️</span>
                <div>
                    <h1>CodeGuardian AI Debugger</h1>
                    <div class="header-subtitle">${isWelcome ? 'Ready to protect your code' : `Analysis: ${data.type === 'fix' ? 'Code Fix' : 'Code Explanation'}`}</div>
                </div>
            </div>
            ${providerBadge}
        </div>

        ${isWelcome ? this.getWelcomeHtml() : this.getAnalysisHtml(data, escapeHtml)}

        <div class="status-bar">
            <span class="status-dot"></span>
            CodeGuardian AI is active and monitoring your code
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function copyCode(elementId) {
            const codeElement = document.getElementById(elementId);
            if (codeElement) {
                const text = codeElement.textContent || '';
                vscode.postMessage({ command: 'copyCode', text });

                // Visual feedback
                const btn = event.currentTarget;
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                btn.style.borderColor = 'var(--accent-green)';
                btn.style.color = 'var(--accent-green)';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }, 1500);
            }
        }

        function applyFix(elementId) {
            const codeElement = document.getElementById(elementId);
            if (codeElement) {
                const code = codeElement.textContent || '';
                vscode.postMessage({ command: 'applyFix', code });
            }
        }

        // Toggle card collapse
        document.querySelectorAll('.card-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                if (content) {
                    content.style.display = content.style.display === 'none' ? 'block' : 'none';
                }
            });
        });
    </script>
</body>
</html>`;
    }

    /**
     * Generate the welcome screen HTML.
     */
    private getWelcomeHtml(): string {
        return `
        <div class="welcome">
            <div class="welcome-icon">🛡️</div>
            <h2>Welcome to CodeGuardian AI</h2>
            <p>Your intelligent debugging assistant. Select code and use these shortcuts to get started:</p>
            <div class="shortcut-grid">
                <div class="shortcut-item">
                    <span class="shortcut-key">Ctrl+Shift+E</span>
                    <span class="shortcut-label">Explain Code</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">Ctrl+Shift+F</span>
                    <span class="shortcut-label">Fix Code</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">Ctrl+Shift+D</span>
                    <span class="shortcut-label">Debug Panel</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">Ctrl+Shift+S</span>
                    <span class="shortcut-label">Suggest Line</span>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate the analysis results HTML.
     */
    private getAnalysisHtml(data: DebugPanelData, escapeHtml: (s: string) => string): string {
        let html = '';

        // Original code section
        if (data.originalCode) {
            html += `
            <div class="card severity-bug">
                <div class="card-header">
                    <span class="card-icon">🔍</span>
                    <span class="card-title">Original Code</span>
                </div>
                <div class="card-content">
                    <div class="code-block">
                        <div class="code-toolbar">
                            <button class="code-btn" onclick="copyCode('original-code')">📋 Copy</button>
                        </div>
                        <pre><code id="original-code">${escapeHtml(data.originalCode)}</code></pre>
                    </div>
                </div>
            </div>`;
        }

        // Bug / Explanation section
        if (data.explanation) {
            html += `
            <div class="card severity-explain">
                <div class="card-header">
                    <span class="card-icon">💡</span>
                    <span class="card-title">${data.type === 'fix' ? 'Bug Detected & Analysis' : 'AI Explanation'}</span>
                </div>
                <div class="card-content">
                    <p>${escapeHtml(data.explanation)}</p>
                </div>
            </div>`;
        }

        // Suggested fix section
        if (data.suggestedFix) {
            html += `
            <div class="card severity-fix">
                <div class="card-header">
                    <span class="card-icon">🔧</span>
                    <span class="card-title">Suggested Fix</span>
                </div>
                <div class="card-content">
                    <p>${escapeHtml(data.suggestedFix)}</p>
                </div>
            </div>`;
        }

        // Improved code section
        if (data.improvedCode) {
            html += `
            <div class="card severity-code">
                <div class="card-header">
                    <span class="card-icon">✨</span>
                    <span class="card-title">Improved Code</span>
                </div>
                <div class="card-content">
                    <div class="code-block">
                        <div class="code-toolbar">
                            <button class="code-btn" onclick="copyCode('improved-code')">📋 Copy</button>
                            <button class="code-btn apply-btn" onclick="applyFix('improved-code')">🚀 Apply Fix</button>
                        </div>
                        <pre><code id="improved-code">${escapeHtml(data.improvedCode)}</code></pre>
                    </div>
                </div>
            </div>`;
        }

        // Example input/output
        if (data.exampleInput || data.exampleOutput) {
            html += `
            <div class="card severity-example">
                <div class="card-header">
                    <span class="card-icon">📊</span>
                    <span class="card-title">Example Input / Output</span>
                </div>
                <div class="card-content">
                    ${data.exampleInput ? `
                    <p><strong style="color: var(--accent-orange);">Input:</strong></p>
                    <div class="code-block">
                        <pre><code>${escapeHtml(data.exampleInput)}</code></pre>
                    </div>` : ''}
                    ${data.exampleOutput ? `
                    <p style="margin-top: 12px;"><strong style="color: var(--accent-green);">Output:</strong></p>
                    <div class="code-block">
                        <pre><code>${escapeHtml(data.exampleOutput)}</code></pre>
                    </div>` : ''}
                </div>
            </div>`;
        }

        return html;
    }

    /**
     * Generate a cryptographic nonce for Content Security Policy.
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Dispose of the panel and clean up resources.
     */
    private dispose(): void {
        DebugPanelProvider.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
