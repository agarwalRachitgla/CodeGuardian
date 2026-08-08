/**
 * CodeGuardian AI - Logger
 * 
 * Centralized logging utility that writes to VS Code's Output Channel
 * for debugging and monitoring extension behavior.
 */

import * as vscode from 'vscode';

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('CodeGuardian AI');
    }

    /**
     * Get the singleton Logger instance.
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Log an informational message.
     */
    public info(message: string): void {
        this.log('INFO', message);
    }

    /**
     * Log a warning message.
     */
    public warn(message: string, ...args: any[]): void {
        this.log('WARN', message, ...args);
    }

    /**
     * Log an error message.
     */
    public error(message: string, ...args: any[]): void {
        this.log('ERROR', message, ...args);
    }

    /**
     * Log a debug message.
     */
    public debug(message: string): void {
        this.log('DEBUG', message);
    }

    /**
     * Write a formatted log entry.
     */
    private log(level: string, message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0
            ? ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
            : '';

        this.outputChannel.appendLine(
            `[${timestamp}] [${level}] ${message}${formattedArgs}`
        );
    }

    /**
     * Show the output channel.
     */
    public show(): void {
        this.outputChannel.show();
    }

    /**
     * Dispose of the output channel.
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }
}
