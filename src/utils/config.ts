/**
 * CodeGuardian AI - Configuration Loader
 * 
 * Loads environment variables from .env file and merges
 * with VS Code extension settings.
 * 
 * Supports:
 *   - Single GEMINI_API_KEY or comma-separated GEMINI_API_KEYS
 *   - Individual keys: GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
 *   - All found keys are pooled for automatic rotation
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';

/**
 * Load environment configuration from .env file if available.
 * VS Code settings take precedence over .env values.
 */
export function loadEnvConfig(context: vscode.ExtensionContext): void {
    const logger = Logger.getInstance();

    // Try to find .env file in multiple locations
    const possiblePaths = [
        // Extension directory
        path.join(context.extensionPath, '.env'),
        // Workspace root
        ...(vscode.workspace.workspaceFolders?.map(
            (folder) => path.join(folder.uri.fsPath, '.env')
        ) || []),
    ];

    for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                parseEnvFile(envContent);
                logger.info(`Loaded environment config from: ${envPath}`);
                return;
            } catch (error: any) {
                logger.warn(`Failed to load .env from ${envPath}: ${error.message}`);
            }
        }
    }

    logger.info('No .env file found. Using VS Code settings for configuration.');
}

/**
 * Parse a .env file content and set environment variables.
 * Does not overwrite existing environment variables.
 */
function parseEnvFile(content: string): void {
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.substring(0, separatorIndex).trim();
        let value = trimmed.substring(separatorIndex + 1).trim();

        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        // Don't overwrite existing env vars
        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}

/**
 * Collect all Gemini API keys from all sources.
 * Sources (in priority order):
 *   1. VS Code settings: codeguardian.geminiApiKeys (comma-separated)
 *   2. VS Code settings: codeguardian.geminiApiKey (single)
 *   3. Env: GEMINI_API_KEYS (comma-separated)
 *   4. Env: GEMINI_API_KEY (single)
 *   5. Env: GEMINI_API_KEY_1 through GEMINI_API_KEY_10
 */
function collectGeminiKeys(): string[] {
    const keys: Set<string> = new Set();
    const config = vscode.workspace.getConfiguration('codeguardian');

    // From VS Code settings — comma-separated
    const settingsKeys = config.get<string>('geminiApiKeys', '');
    if (settingsKeys) {
        settingsKeys.split(',').map(k => k.trim()).filter(Boolean).forEach(k => keys.add(k));
    }

    // From VS Code settings — single key
    const settingsKey = config.get<string>('geminiApiKey', '');
    if (settingsKey) { keys.add(settingsKey); }

    // From env — comma-separated
    const envKeys = process.env.GEMINI_API_KEYS || '';
    if (envKeys) {
        envKeys.split(',').map(k => k.trim()).filter(Boolean).forEach(k => keys.add(k));
    }

    // From env — single key
    const envKey = process.env.GEMINI_API_KEY || '';
    if (envKey) { keys.add(envKey); }

    // From env — numbered keys (GEMINI_API_KEY_1 through GEMINI_API_KEY_10)
    for (let i = 1; i <= 10; i++) {
        const numberedKey = process.env[`GEMINI_API_KEY_${i}`] || '';
        if (numberedKey) { keys.add(numberedKey); }
    }

    return Array.from(keys);
}

export function getExtensionConfig(): {
    groqApiKey: string;
    geminiApiKey: string;         // First available key (backwards compat)
    geminiApiKeys: string[];      // ALL keys in the pool
    enableRealTimeDetection: boolean;
    enableCodeSuggestions: boolean;
    debounceDelay: number;
    maxCacheSize: number;
} {
    const config = vscode.workspace.getConfiguration('codeguardian');
    const geminiKeys = collectGeminiKeys();

    return {
        groqApiKey: config.get<string>('groqApiKey', '') || process.env.GROQ_API_KEY || '',
        geminiApiKey: geminiKeys[0] || '',
        geminiApiKeys: geminiKeys,
        enableRealTimeDetection: config.get<boolean>('enableRealTimeDetection', true),
        enableCodeSuggestions: config.get<boolean>('enableCodeSuggestions', true),
        debounceDelay: config.get<number>('debounceDelay', 1500),
        maxCacheSize: config.get<number>('maxCacheSize', 50),
    };
}
