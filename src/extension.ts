/**
 * CodeGuardian AI - Main Extension Entry Point
 * 
 * Activates the extension and registers all providers, commands,
 * and event listeners for real-time bug detection and AI-powered debugging.
 */

import * as vscode from 'vscode';
import { BugDetector } from './analyzers/bugDetector';
import { AIService } from './services/aiService';
import { DebugPanelProvider } from './ui/debugPanel';
import { StartupPanel } from './ui/startupPanel';
import { CodeGuardianCodeActionProvider } from './providers/codeActionProvider';
import { CodeSuggestionProvider } from './providers/codeSuggestionProvider';
import { CodeGuardianCodeLensProvider } from './providers/codeLensProvider';
import { DecorationProvider } from './providers/decorationProvider';
import { LocalStorageService } from './services/localStorageService';
import { ResponseCache } from './utils/cache';
import { debounce } from './utils/debounce';
import { loadEnvConfig } from './utils/config';
import { Logger } from './utils/logger';

let diagnosticCollection: vscode.DiagnosticCollection;
let bugDetector: BugDetector;
let aiService: AIService;
let storageService: LocalStorageService;
let responseCache: ResponseCache;
let logger: Logger;
let statusBarItem: vscode.StatusBarItem;
let decorationProvider: DecorationProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    logger = Logger.getInstance();
    logger.info('CodeGuardian AI is activating...');

    // Load environment config
    loadEnvConfig(context);

    // Initialize core services
    diagnosticCollection = vscode.languages.createDiagnosticCollection('codeguardian');
    bugDetector = new BugDetector(diagnosticCollection);
    aiService = new AIService();
    responseCache = new ResponseCache();
    decorationProvider = new DecorationProvider(diagnosticCollection);

    // Initialize local storage (replaces Supabase — zero config, works offline)
    storageService = new LocalStorageService(context);
    storageService.recordSessionStart();

    // ── Status Bar Indicator ──
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(shield) CodeGuardian AI';
    statusBarItem.tooltip = 'CodeGuardian AI is active — click to open Debug Panel';
    statusBarItem.command = 'codeguardian.openDebugPanel';
    statusBarItem.backgroundColor = undefined;
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Update status bar + decorations when editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && isSupportedLanguage(editor.document.languageId)) {
                statusBarItem.text = '$(shield) CodeGuardian AI — Watching';
                statusBarItem.tooltip = `CodeGuardian AI is monitoring ${editor.document.fileName.split(/[/\\]/).pop()}`;
                decorationProvider.updateDecorations(editor);
            } else {
                statusBarItem.text = '$(shield) CodeGuardian AI';
                statusBarItem.tooltip = 'CodeGuardian AI is active — open a supported file to enable analysis';
                if (editor) { decorationProvider.clearDecorations(editor); }
            }
        })
    );

    // Refresh decorations when diagnostics change
    context.subscriptions.push(
        vscode.languages.onDidChangeDiagnostics(() => {
            const editor = vscode.window.activeTextEditor;
            if (editor && isSupportedLanguage(editor.document.languageId)) {
                decorationProvider.updateDecorations(editor);
            }
        })
    );

    // Supported languages
    const supportedLanguages = [
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'javascriptreact' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'python' },
        { scheme: 'file', language: 'html' },
        { scheme: 'file', language: 'css' },
        { scheme: 'file', language: 'java' },
    ];

    // Register CodeAction provider (Quick Fix)
    const codeActionProvider = new CodeGuardianCodeActionProvider(aiService, responseCache);
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            supportedLanguages,
            codeActionProvider,
            { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
        )
    );

    // Register CodeLens provider (bug count above functions)
    const codeLensProvider = new CodeGuardianCodeLensProvider(diagnosticCollection);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(supportedLanguages, codeLensProvider)
    );

    // Register Inline Completion provider (Code Suggestions)
    const config = vscode.workspace.getConfiguration('codeguardian');
    if (config.get<boolean>('enableCodeSuggestions', true)) {
        const codeSuggestionProvider = new CodeSuggestionProvider(aiService, responseCache);
        context.subscriptions.push(
            vscode.languages.registerInlineCompletionItemProvider(
                supportedLanguages,
                codeSuggestionProvider
            )
        );
    }

    // Register commands
    registerCommands(context);

    // Real-time detection setup
    if (config.get<boolean>('enableRealTimeDetection', true)) {
        setupRealTimeDetection(context);
    }

    // Analyze the currently active document
    if (vscode.window.activeTextEditor) {
        analyzeDocument(vscode.window.activeTextEditor.document);
    }

    context.subscriptions.push(diagnosticCollection);

    logger.info('CodeGuardian AI activated successfully!');

    // Show startup panel with API health checks and motivational greeting
    StartupPanel.show(context.extensionUri).catch((err) => {
        logger.warn('Startup panel failed to show:', err.message);
    });
}

function registerCommands(context: vscode.ExtensionContext): void {
    // Explain Code command
    context.subscriptions.push(
        vscode.commands.registerCommand('codeguardian.explainCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText.trim()) {
                vscode.window.showWarningMessage('Please select code to explain.');
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: '🛡️ CodeGuardian AI: Analyzing code...',
                    cancellable: false,
                },
                async () => {
                    try {
                        const cacheKey = `explain:${selectedText}`;
                        let response = responseCache.get(cacheKey);

                        if (!response) {
                            response = await aiService.explainCode(selectedText, editor.document.languageId);
                            responseCache.set(cacheKey, response);
                        }

                        // Store in local history
                        storageService.logQuery('explain', selectedText, response, editor.document.languageId);

                        DebugPanelProvider.createOrShow(context.extensionUri, {
                            type: 'explanation',
                            originalCode: selectedText,
                            ...response,
                        });
                    } catch (error: any) {
                        logger.error('Explain code failed:', error);
                        vscode.window.showErrorMessage(`CodeGuardian AI: ${error.message}`);
                    }
                }
            );
        })
    );

    // Fix Code command
    context.subscriptions.push(
        vscode.commands.registerCommand('codeguardian.fixCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText.trim()) {
                vscode.window.showWarningMessage('Please select code to fix.');
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: '🛡️ CodeGuardian AI: Generating fix...',
                    cancellable: false,
                },
                async () => {
                    try {
                        const cacheKey = `fix:${selectedText}`;
                        let response = responseCache.get(cacheKey);

                        if (!response) {
                            response = await aiService.fixCode(selectedText, editor.document.languageId);
                            responseCache.set(cacheKey, response);
                        }

                        // Store in local history
                        storageService.logQuery('fix', selectedText, response, editor.document.languageId);

                        DebugPanelProvider.createOrShow(context.extensionUri, {
                            type: 'fix',
                            originalCode: selectedText,
                            ...response,
                        });
                    } catch (error: any) {
                        logger.error('Fix code failed:', error);
                        vscode.window.showErrorMessage(`CodeGuardian AI: ${error.message}`);
                    }
                }
            );
        })
    );

    // Open Debug Panel command
    context.subscriptions.push(
        vscode.commands.registerCommand('codeguardian.openDebugPanel', () => {
            DebugPanelProvider.createOrShow(context.extensionUri, {
                type: 'welcome',
                explanation: 'Welcome to CodeGuardian AI Debugger! Select code and use the commands to get started.',
                suggestedFix: '',
                improvedCode: '',
                originalCode: '',
            });
        })
    );

    // Suggest Next Line command
    context.subscriptions.push(
        vscode.commands.registerCommand('codeguardian.suggestNextLine', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            const position = editor.selection.active;
            const textUpToCursor = editor.document.getText(
                new vscode.Range(new vscode.Position(0, 0), position)
            );

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: '🛡️ CodeGuardian AI: Suggesting next line...',
                    cancellable: false,
                },
                async () => {
                    try {
                        const cacheKey = `suggest:${textUpToCursor.slice(-500)}`;
                        let suggestion = responseCache.get(cacheKey);

                        if (!suggestion) {
                            suggestion = await aiService.suggestNextLine(textUpToCursor, editor.document.languageId);
                            responseCache.set(cacheKey, suggestion);
                        }

                        if (suggestion?.suggestion) {
                            const nextLinePos = new vscode.Position(position.line + 1, 0);
                            await editor.edit((editBuilder) => {
                                editBuilder.insert(nextLinePos, suggestion.suggestion + '\n');
                            });
                            vscode.window.showInformationMessage('🛡️ CodeGuardian: Line suggestion inserted!');
                        }
                    } catch (error: any) {
                        logger.error('Suggest next line failed:', error);
                        vscode.window.showErrorMessage(`CodeGuardian AI: ${error.message}`);
                    }
                }
            );
        })
    );

    // Clear Diagnostics command
    context.subscriptions.push(
        vscode.commands.registerCommand('codeguardian.clearDiagnostics', () => {
            diagnosticCollection.clear();
            vscode.window.showInformationMessage('🛡️ CodeGuardian: Diagnostics cleared.');
        })
    );
}

function setupRealTimeDetection(context: vscode.ExtensionContext): void {
    const config = vscode.workspace.getConfiguration('codeguardian');
    const delay = config.get<number>('debounceDelay', 1500);

    const debouncedAnalyze = debounce((document: vscode.TextDocument) => {
        analyzeDocument(document);
    }, delay);

    // Analyze on document change
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (isSupportedLanguage(event.document.languageId)) {
                debouncedAnalyze(event.document);
            }
        })
    );

    // Analyze on document open
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => {
            if (isSupportedLanguage(document.languageId)) {
                analyzeDocument(document);
            }
        })
    );

    // Analyze on editor change
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && isSupportedLanguage(editor.document.languageId)) {
                analyzeDocument(editor.document);
            }
        })
    );
}

function analyzeDocument(document: vscode.TextDocument): void {
    if (!isSupportedLanguage(document.languageId)) {
        return;
    }

    try {
        bugDetector.analyze(document);
    } catch (error: any) {
        logger.error('Document analysis failed:', error);
    }
}

function isSupportedLanguage(languageId: string): boolean {
    return [
        'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
        'python', 'html', 'css', 'java',
    ].includes(languageId);
}

// LocalStorageService is initialized in activate() — no config needed

export function deactivate(): void {
    logger.info('CodeGuardian AI deactivated.');
    diagnosticCollection?.dispose();
}
