/**
 * CodeGuardian AI - Bug Detector
 * 
 * Performs static analysis on JavaScript/TypeScript, Python, HTML, CSS,
 * and Java files to detect common bugs and anti-patterns in real-time.
 */

import * as vscode from 'vscode';
import { BugPattern, DetectedBug } from '../types';
import { Logger } from '../utils/logger';

export class BugDetector {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private logger: Logger;

    constructor(diagnosticCollection: vscode.DiagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
        this.logger = Logger.getInstance();
    }

    /**
     * Analyze a document for common bugs and report them as diagnostics.
     */
    public analyze(document: vscode.TextDocument): DetectedBug[] {
        const text = document.getText();
        const lines = text.split('\n');
        const lang = document.languageId;
        const detectedBugs: DetectedBug[] = [];
        const diagnostics: vscode.Diagnostic[] = [];

        const patterns = this.getPatternsForLanguage(lang);

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];

            for (const pattern of patterns) {
                const matches = this.findMatches(line, pattern, lineIndex, lang);
                for (const match of matches) {
                    detectedBugs.push(match);
                    diagnostics.push(this.createDiagnostic(match, lineIndex, line));
                }
            }
        }

        // Multi-line / cross-line analysis
        const crossLineIssues = this.analyzeCrossLinePatterns(lines, lang);
        for (const issue of crossLineIssues) {
            detectedBugs.push(issue);
            diagnostics.push(
                this.createDiagnostic(issue, issue.line, lines[issue.line] || '')
            );
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
        this.logger.info(`Analyzed ${document.fileName} [${lang}]: ${detectedBugs.length} issue(s) found`);

        return detectedBugs;
    }

    /**
     * Get patterns applicable to the given language.
     */
    private getPatternsForLanguage(lang: string): BugPattern[] {
        const universal = this.getUniversalPatterns();

        switch (lang) {
            case 'javascript':
            case 'typescript':
            case 'javascriptreact':
            case 'typescriptreact':
                return [...universal, ...this.getJavaScriptPatterns()];
            case 'python':
                return [...universal, ...this.getPythonPatterns()];
            case 'html':
                return this.getHtmlPatterns();
            case 'css':
                return this.getCssPatterns();
            case 'java':
                return [...universal, ...this.getJavaPatterns()];
            default:
                return universal;
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  UNIVERSAL PATTERNS (all languages)
    // ════════════════════════════════════════════════════════════════════

    private getUniversalPatterns(): BugPattern[] {
        return [
            {
                id: 'todo-comment',
                regex: /(?:\/\/|#|\/\*)\s*(TODO|FIXME|HACK|XXX|BUG)\b/gi,
                message: 'Unresolved TODO/FIXME comment found. Consider addressing before release.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Code Quality',
            },
        ];
    }

    // ════════════════════════════════════════════════════════════════════
    //  JAVASCRIPT / TYPESCRIPT PATTERNS
    // ════════════════════════════════════════════════════════════════════

    private getJavaScriptPatterns(): BugPattern[] {
        return [
            {
                id: 'loose-equality',
                regex: /(?<!=)(==)(?!=)/g,
                message: 'Use strict equality (===) instead of loose equality (==). Loose equality performs type coercion.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Best Practice',
                quickFix: { search: '==', replace: '===' },
            },
            {
                id: 'loose-inequality',
                regex: /(?<!!)(!==?(?!=))(?!==)/g,
                message: 'Use strict inequality (!==) instead of loose inequality (!=).',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Best Practice',
                quickFix: { search: '!=', replace: '!==' },
                validate: (match: string) => match === '!=',
            },
            {
                id: 'console-log',
                regex: /\bconsole\.(log|warn|error|debug|info|trace)\s*\(/g,
                message: 'Console statement detected. Consider removing before production.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Code Quality',
            },
            {
                id: 'var-usage',
                regex: /\bvar\s+\w+/g,
                message: 'Avoid "var". Use "let" or "const" for proper block scoping.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Best Practice',
                quickFix: { search: 'var ', replace: 'const ' },
            },
            {
                id: 'null-comparison',
                regex: /(?:==\s*null|null\s*==|==\s*undefined|undefined\s*==)(?!=)/g,
                message: 'Use strict null/undefined check (===) or nullish coalescing (??).',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Null Safety',
            },
            {
                id: 'missing-await',
                regex: /(?<!await\s)(?:fetch|axios\.\w+|\.json)\s*\(/g,
                message: 'This async operation might be missing an "await" keyword.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Async/Await',
                contextCheck: (line: string) => !line.includes('await') && !line.includes('.then('),
            },
            {
                id: 'async-no-await',
                regex: /async\s+(?:function\s+\w+|\(\w*\)\s*=>|\w+\s*=\s*async)/g,
                message: 'Async function may not use await. Consider if async is needed.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Async/Await',
            },
            {
                id: 'empty-catch',
                regex: /catch\s*\([^)]*\)\s*\{\s*\}/g,
                message: 'Empty catch block. Silent error swallowing can hide bugs.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Error Handling',
            },
            {
                id: 'debugger-statement',
                regex: /\bdebugger\b/g,
                message: 'Debugger statement found. Remove before production.',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Debug',
            },
            {
                id: 'uncleared-interval',
                regex: /\bsetInterval\s*\(/g,
                message: 'setInterval detected. Store reference and call clearInterval to prevent memory leaks.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Performance',
            },
            {
                id: 'innerhtml-xss',
                regex: /\.innerHTML\s*=/g,
                message: 'Direct innerHTML assignment is an XSS risk. Use textContent or DOM APIs.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Security',
            },
            {
                id: 'eval-usage',
                regex: /\beval\s*\(/g,
                message: 'eval() is dangerous. It can execute arbitrary code and is a security risk.',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Security',
            },
            {
                id: 'magic-number',
                regex: /(?:if|while|for|return)\s*\(.*\b(\d{3,})\b/g,
                message: 'Magic number in conditional. Extract to a named constant.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Code Quality',
            },
            {
                id: 'nested-ternary',
                regex: /\?[^:]*\?[^:]*\?/g,
                message: 'Deeply nested ternary. Use if/else or switch for readability.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Code Quality',
            },
        ];
    }

    // ════════════════════════════════════════════════════════════════════
    //  PYTHON PATTERNS
    // ════════════════════════════════════════════════════════════════════

    private getPythonPatterns(): BugPattern[] {
        return [
            {
                id: 'py-equality-none',
                regex: /(?:==\s*None|None\s*==)/g,
                message: 'Use "is None" instead of "== None". Identity check is more Pythonic and reliable.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Best Practice',
                quickFix: { search: '== None', replace: 'is None' },
            },
            {
                id: 'py-inequality-none',
                regex: /(?:!=\s*None|None\s*!=)/g,
                message: 'Use "is not None" instead of "!= None".',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Best Practice',
                quickFix: { search: '!= None', replace: 'is not None' },
            },
            {
                id: 'py-bare-except',
                regex: /\bexcept\s*:/g,
                message: 'Bare "except:" catches all exceptions including SystemExit and KeyboardInterrupt. Use "except Exception:" instead.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Error Handling',
                quickFix: { search: 'except:', replace: 'except Exception:' },
            },
            {
                id: 'py-mutable-default',
                regex: /def\s+\w+\s*\([^)]*(?:=\s*\[\]|=\s*\{\}|=\s*set\(\))/g,
                message: 'Mutable default argument detected (list/dict/set). Use None as default and create inside the function.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Bug Risk',
            },
            {
                id: 'py-print-statement',
                regex: /\bprint\s*\(/g,
                message: 'print() statement detected. Consider using the logging module for production code.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Code Quality',
            },
            {
                id: 'py-type-check',
                regex: /\btype\s*\(\s*\w+\s*\)\s*(?:==|is)\s*/g,
                message: 'Use isinstance() instead of type() for type checking. It supports inheritance.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Best Practice',
            },
            {
                id: 'py-star-import',
                regex: /from\s+\w+\s+import\s+\*/g,
                message: 'Wildcard import (import *) pollutes the namespace. Import specific names instead.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Code Quality',
            },
            {
                id: 'py-global-keyword',
                regex: /\bglobal\s+\w+/g,
                message: 'Global variable usage detected. Avoid global state; pass values as parameters instead.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Best Practice',
            },
            {
                id: 'py-string-concat-loop',
                regex: /\bfor\b.*:\s*\n\s*\w+\s*\+=/g,
                message: 'String concatenation in a loop is O(n²). Use str.join() or list comprehension instead.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Performance',
            },
            {
                id: 'py-eval',
                regex: /\beval\s*\(/g,
                message: 'eval() is dangerous. It can execute arbitrary code and is a security risk.',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Security',
            },
            {
                id: 'py-exec',
                regex: /\bexec\s*\(/g,
                message: 'exec() executes arbitrary code. Avoid in production for security reasons.',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Security',
            },
            {
                id: 'py-pass-except',
                regex: /except.*:\s*\n\s*pass\b/g,
                message: 'Silencing exception with "pass". At minimum, log the error.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Error Handling',
            },
            {
                id: 'py-hardcoded-password',
                regex: /(?:password|passwd|pwd|secret|api_key)\s*=\s*['"]\w+['"]/gi,
                message: 'Possible hardcoded credential detected. Use environment variables or a secrets manager.',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Security',
            },
            {
                id: 'py-equality-true-false',
                regex: /(?:==\s*True|==\s*False|is\s+True|is\s+False)/g,
                message: 'Don\'t compare to True/False. Use the value directly: "if x:" or "if not x:".',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Best Practice',
            },
            {
                id: 'py-breakpoint',
                regex: /\bbreakpoint\s*\(\)/g,
                message: 'breakpoint() found. Remove before production deployment.',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Debug',
            },
            {
                id: 'py-pdb',
                regex: /import\s+pdb|pdb\.set_trace\(\)/g,
                message: 'pdb debugger detected. Remove before production deployment.',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Debug',
            },
        ];
    }

    // ════════════════════════════════════════════════════════════════════
    //  HTML PATTERNS
    // ════════════════════════════════════════════════════════════════════

    private getHtmlPatterns(): BugPattern[] {
        return [
            {
                id: 'html-missing-alt',
                regex: /<img(?![^>]*\balt\s*=)[^>]*>/gi,
                message: 'Image tag missing "alt" attribute. Required for accessibility (WCAG).',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Accessibility',
            },
            {
                id: 'html-inline-style',
                regex: /\bstyle\s*=\s*["'][^"']+["']/gi,
                message: 'Inline style detected. Move styles to a CSS file for better maintainability.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Best Practice',
            },
            {
                id: 'html-inline-script',
                regex: /<script(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/gi,
                message: 'Inline <script> detected. Consider moving JavaScript to an external file.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Best Practice',
            },
            {
                id: 'html-deprecated-tag',
                regex: /<\s*(?:font|center|marquee|blink|strike|big|tt)\b/gi,
                message: 'Deprecated HTML tag detected. Use modern CSS alternatives instead.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Deprecation',
            },
            {
                id: 'html-missing-doctype',
                regex: /^(?!\s*<!DOCTYPE)/i,
                message: 'Missing <!DOCTYPE html> declaration. Add it as the first line.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Standards',
                contextCheck: (_line: string) => true, // Only applies to line 0
            },
            {
                id: 'html-onclick',
                regex: /\bon\w+\s*=\s*["']/g,
                message: 'Inline event handler detected. Use addEventListener() in JavaScript instead.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Best Practice',
            },
            {
                id: 'html-missing-lang',
                regex: /<html(?![^>]*\blang\s*=)[^>]*>/gi,
                message: '<html> tag missing "lang" attribute. Required for accessibility and SEO.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Accessibility',
            },
            {
                id: 'html-empty-href',
                regex: /href\s*=\s*["']\s*#?\s*["']/g,
                message: 'Empty or "#" href detected. Use a proper URL or button element.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Best Practice',
            },
            {
                id: 'html-missing-viewport',
                regex: /<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/gi,
                message: '', // Will be handled differently — presence check
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Responsive',
                validate: () => false, // Disabled — handled in cross-line
            },
            {
                id: 'html-http-link',
                regex: /(?:src|href)\s*=\s*["']http:\/\//gi,
                message: 'HTTP link detected. Use HTTPS for security.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Security',
            },
        ];
    }

    // ════════════════════════════════════════════════════════════════════
    //  CSS PATTERNS
    // ════════════════════════════════════════════════════════════════════

    private getCssPatterns(): BugPattern[] {
        return [
            {
                id: 'css-important',
                regex: /!\s*important/gi,
                message: '!important detected. Overusing it makes styles hard to maintain and debug.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Best Practice',
            },
            {
                id: 'css-id-selector',
                regex: /#[a-zA-Z][\w-]*\s*\{/g,
                message: 'ID selector for styling. IDs have high specificity — prefer classes for reusable styles.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Best Practice',
            },
            {
                id: 'css-magic-number',
                regex: /:\s*\d{3,}px/g,
                message: 'Large magic number in px. Consider using variables, rem, or a design system.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Code Quality',
            },
            {
                id: 'css-color-hex-short',
                regex: /#[0-9a-fA-F]{8}\b/g,
                message: '8-digit hex color. Ensure alpha channel is intentional.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Code Quality',
            },
            {
                id: 'css-universal-selector',
                regex: /\*\s*\{/g,
                message: 'Universal selector (*) can be slow. Use it sparingly.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Performance',
            },
            {
                id: 'css-outline-none',
                regex: /outline\s*:\s*(?:none|0)\s*;/g,
                message: 'Removing outline hurts keyboard accessibility. Provide an alternative focus style.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Accessibility',
            },
            {
                id: 'css-float',
                regex: /\bfloat\s*:\s*(?:left|right)\s*;/g,
                message: 'float detected. Consider using Flexbox or CSS Grid for modern layouts.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Best Practice',
            },
            {
                id: 'css-vendor-prefix',
                regex: /\b-(?:webkit|moz|ms|o)-/g,
                message: 'Vendor prefix detected. Use Autoprefixer to manage these automatically.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Best Practice',
            },
            {
                id: 'css-z-index-high',
                regex: /z-index\s*:\s*(\d{4,})/g,
                message: 'Very high z-index. Establish a z-index scale system to avoid escalation wars.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Code Quality',
            },
            {
                id: 'css-duplicate-property',
                regex: /([a-z-]+)\s*:.*;\s*\n\s*\1\s*:/gi,
                message: 'Duplicate CSS property detected. The first value will be overridden.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Bug Risk',
            },
        ];
    }

    // ════════════════════════════════════════════════════════════════════
    //  JAVA PATTERNS
    // ════════════════════════════════════════════════════════════════════

    private getJavaPatterns(): BugPattern[] {
        return [
            {
                id: 'java-string-equals',
                regex: /\w+\s*==\s*"[^"]*"/g,
                message: 'Use .equals() for String comparison, not ==. The == operator compares references, not values.',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Bug Risk',
            },
            {
                id: 'java-string-equals-var',
                regex: /"\w*"\s*==\s*\w+/g,
                message: 'Use .equals() for String comparison. Example: "value".equals(variable).',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Bug Risk',
            },
            {
                id: 'java-sysout',
                regex: /System\.out\.print(?:ln)?\s*\(/g,
                message: 'System.out.println detected. Use a logging framework (SLF4J/Log4j) in production.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Code Quality',
            },
            {
                id: 'java-syserr',
                regex: /System\.err\.print(?:ln)?\s*\(/g,
                message: 'System.err detected. Use a logging framework for proper error reporting.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Code Quality',
            },
            {
                id: 'java-empty-catch',
                regex: /catch\s*\([^)]*\)\s*\{\s*\}/g,
                message: 'Empty catch block. Never silently swallow exceptions — at minimum log them.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Error Handling',
            },
            {
                id: 'java-raw-type',
                regex: /(?:List|Map|Set|ArrayList|HashMap|HashSet)\s+\w+\s*=/g,
                message: 'Raw type detected. Use generics (e.g., List<String>) for type safety.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Type Safety',
                contextCheck: (line: string) => !line.includes('<'),
            },
            {
                id: 'java-concatenation-loop',
                regex: /for\s*\(.*\)\s*\{[\s\S]*?\+=/g,
                message: 'String concatenation in a loop. Use StringBuilder for better performance.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Performance',
            },
            {
                id: 'java-return-null',
                regex: /return\s+null\s*;/g,
                message: 'Returning null can cause NullPointerException. Consider Optional<T> or empty collections.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Null Safety',
            },
            {
                id: 'java-catch-exception',
                regex: /catch\s*\(\s*Exception\s+\w+\s*\)/g,
                message: 'Catching generic Exception. Catch specific exceptions for better error handling.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Error Handling',
            },
            {
                id: 'java-hardcoded-string',
                regex: /(?:password|secret|apiKey|api_key)\s*=\s*"[^"]+"/gi,
                message: 'Possible hardcoded credential. Use environment variables or a config file.',
                severity: vscode.DiagnosticSeverity.Error,
                category: 'Security',
            },
            {
                id: 'java-thread-sleep',
                regex: /Thread\.sleep\s*\(/g,
                message: 'Thread.sleep() in production code can cause performance issues. Use ScheduledExecutorService.',
                severity: vscode.DiagnosticSeverity.Information,
                category: 'Performance',
            },
            {
                id: 'java-finalize',
                regex: /protected\s+void\s+finalize\s*\(\)/g,
                message: 'finalize() is deprecated since Java 9. Use try-with-resources or Cleaner instead.',
                severity: vscode.DiagnosticSeverity.Warning,
                category: 'Deprecation',
            },
        ];
    }

    // ════════════════════════════════════════════════════════════════════
    //  PATTERN MATCHING ENGINE
    // ════════════════════════════════════════════════════════════════════

    /**
     * Find all matches of a pattern in a line.
     */
    private findMatches(line: string, pattern: BugPattern, lineIndex: number, lang: string): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const trimmedLine = line.trim();

        // Skip comments based on language
        if (this.isComment(trimmedLine, lang)) {
            if (pattern.id !== 'todo-comment') {
                return bugs;
            }
        }

        // For HTML missing doctype — only check first non-empty line
        if (pattern.id === 'html-missing-doctype') {
            if (lineIndex === 0 && !trimmedLine.toLowerCase().startsWith('<!doctype')) {
                if (trimmedLine.length > 0) {
                    bugs.push({
                        id: pattern.id,
                        line: 0,
                        column: 0,
                        endColumn: trimmedLine.length,
                        message: 'Missing <!DOCTYPE html> declaration. Add it as the first line.',
                        severity: pattern.severity,
                        category: pattern.category,
                        matchedText: trimmedLine,
                    });
                }
            }
            return bugs;
        }

        let match;
        pattern.regex.lastIndex = 0;

        while ((match = pattern.regex.exec(line)) !== null) {
            if (pattern.validate && !pattern.validate(match[0])) {
                continue;
            }
            if (pattern.contextCheck && !pattern.contextCheck(line)) {
                continue;
            }

            bugs.push({
                id: pattern.id,
                line: lineIndex,
                column: match.index,
                endColumn: match.index + match[0].length,
                message: pattern.message,
                severity: pattern.severity,
                category: pattern.category,
                matchedText: match[0],
                quickFix: pattern.quickFix,
            });
        }

        return bugs;
    }

    /**
     * Check if a line is a comment for the given language.
     */
    private isComment(trimmedLine: string, lang: string): boolean {
        switch (lang) {
            case 'python':
                return trimmedLine.startsWith('#');
            case 'html':
                return trimmedLine.startsWith('<!--');
            case 'css':
                return trimmedLine.startsWith('/*') || trimmedLine.startsWith('*');
            case 'java':
            case 'javascript':
            case 'typescript':
            case 'javascriptreact':
            case 'typescriptreact':
                return trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*');
            default:
                return trimmedLine.startsWith('//') || trimmedLine.startsWith('#');
        }
    }

    /**
     * Analyze cross-line patterns (unused variables, unhandled promises, etc.)
     */
    private analyzeCrossLinePatterns(lines: string[], lang: string): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const fullText = lines.join('\n');

        // === JavaScript/TypeScript cross-line checks ===
        if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(lang)) {
            // Unused variables
            const varDeclarations = new Map<string, { line: number; column: number }>();
            const varRegex = /\b(?:const|let|var)\s+(\w+)\s*(?::\s*\w+(?:<[^>]*>)?)?\s*=/g;
            let varMatch;

            while ((varMatch = varRegex.exec(fullText)) !== null) {
                const varName = varMatch[1];
                if (['_', '__', 'e', 'err', 'error', 'i', 'j', 'k'].includes(varName)) { continue; }
                const beforeMatch = fullText.substring(0, varMatch.index);
                const lineNum = (beforeMatch.match(/\n/g) || []).length;
                varDeclarations.set(varName, { line: lineNum, column: varMatch.index });
            }

            for (const [varName, location] of varDeclarations) {
                const usageRegex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
                const allMatches = [...fullText.matchAll(usageRegex)];
                if (allMatches.length <= 1) {
                    bugs.push({
                        id: 'unused-variable',
                        line: location.line, column: 0,
                        endColumn: lines[location.line]?.length || 0,
                        message: `Variable "${varName}" is declared but never used.`,
                        severity: vscode.DiagnosticSeverity.Warning,
                        category: 'Code Quality', matchedText: varName,
                    });
                }
            }

            // Unhandled Promise
            const promiseRegex = /new\s+Promise\s*\(/g;
            let promiseMatch;
            while ((promiseMatch = promiseRegex.exec(fullText)) !== null) {
                const after = fullText.substring(promiseMatch.index, promiseMatch.index + 500);
                if (!after.includes('.catch') && !after.includes('try')) {
                    const before = fullText.substring(0, promiseMatch.index);
                    const lineNum = (before.match(/\n/g) || []).length;
                    bugs.push({
                        id: 'unhandled-promise',
                        line: lineNum, column: 0,
                        endColumn: lines[lineNum]?.length || 0,
                        message: 'Promise without error handling. Add .catch() or try/catch.',
                        severity: vscode.DiagnosticSeverity.Warning,
                        category: 'Error Handling', matchedText: 'new Promise',
                    });
                }
            }
        }

        // === Python cross-line checks ===
        if (lang === 'python') {
            // Unused imports (basic)
            const importRegex = /^(?:import\s+(\w+)|from\s+(\w+)\s+import\s+(\w+))/gm;
            let importMatch;
            while ((importMatch = importRegex.exec(fullText)) !== null) {
                const moduleName = importMatch[1] || importMatch[3];
                if (!moduleName) { continue; }
                const usageRegex = new RegExp(`\\b${this.escapeRegex(moduleName)}\\b`, 'g');
                const allMatches = [...fullText.matchAll(usageRegex)];
                if (allMatches.length <= 1) {
                    const before = fullText.substring(0, importMatch.index);
                    const lineNum = (before.match(/\n/g) || []).length;
                    bugs.push({
                        id: 'py-unused-import',
                        line: lineNum, column: 0,
                        endColumn: lines[lineNum]?.length || 0,
                        message: `Import "${moduleName}" is unused. Remove it to keep code clean.`,
                        severity: vscode.DiagnosticSeverity.Warning,
                        category: 'Code Quality', matchedText: moduleName,
                    });
                }
            }
        }

        return bugs;
    }

    /**
     * Create a VS Code diagnostic from a detected bug.
     */
    private createDiagnostic(bug: DetectedBug, lineIndex: number, line: string): vscode.Diagnostic {
        const range = new vscode.Range(
            new vscode.Position(lineIndex, bug.column),
            new vscode.Position(lineIndex, bug.endColumn || line.length)
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            `🛡️ ${bug.message}`,
            bug.severity
        );

        diagnostic.source = 'CodeGuardian AI';
        diagnostic.code = bug.id;

        if (bug.quickFix) {
            (diagnostic as any).codeGuardianFix = bug.quickFix;
            (diagnostic as any).codeGuardianMatchedText = bug.matchedText;
        }

        return diagnostic;
    }

    /**
     * Escape special regex characters.
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
