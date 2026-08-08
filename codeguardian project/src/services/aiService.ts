/**
 * CodeGuardian AI - AI Service
 * 
 * Handles communication with Groq (primary) and Gemini (fallback) APIs
 * for code explanation, bug fixing, and code suggestions.
 */

import * as vscode from 'vscode';
import * as https from 'https';
import { AIResponse, AISuggestionResponse } from '../types';
import { Logger } from '../utils/logger';

export class AIService {
    private logger: Logger;

    constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Explain the given code using AI.
     */
    public async explainCode(code: string, language: string): Promise<AIResponse> {
        const prompt = this.buildExplainPrompt(code, language);
        return this.queryAI(prompt);
    }

    /**
     * Fix the given code using AI.
     */
    public async fixCode(code: string, language: string): Promise<AIResponse> {
        const prompt = this.buildFixPrompt(code, language);
        return this.queryAI(prompt);
    }

    /**
     * Suggest the next line of code.
     */
    public async suggestNextLine(codeContext: string, language: string): Promise<AISuggestionResponse> {
        const prompt = this.buildSuggestionPrompt(codeContext, language);
        const response = await this.queryAI(prompt);
        return {
            suggestion: response.improvedCode || response.suggestedFix || '',
            confidence: response.confidence,
            provider: response.provider,
        };
    }

    /**
     * Analyze a specific bug pattern with AI for richer explanation.
     */
    public async analyzeBug(code: string, bugMessage: string, language: string): Promise<AIResponse> {
        const prompt = this.buildBugAnalysisPrompt(code, bugMessage, language);
        return this.queryAI(prompt);
    }

    /**
     * Query AI with Groq as primary, Gemini with key pool rotation as secondary.
     * Gemini tries ALL keys × ALL models before giving up.
     */
    private async queryAI(prompt: string): Promise<AIResponse> {
        // Try Groq first
        try {
            const groqKey = this.getApiKey('groqApiKey', 'GROQ_API_KEY');
            if (groqKey) {
                this.logger.info('Querying Groq API...');
                const response = await this.callGroqAPI(groqKey, prompt);
                response.provider = 'groq';
                return response;
            }
            this.logger.warn('No Groq API key found, trying Gemini...');
        } catch (error: any) {
            this.logger.warn(`Groq API failed: ${error.message}. Falling back to Gemini...`);
        }

        // Fallback to Gemini — rotate through ALL keys × ALL models
        const { geminiApiKeys } = require('../utils/config').getExtensionConfig();
        const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
        let lastError: Error | null = null;

        if (geminiApiKeys && geminiApiKeys.length > 0) {
            for (const key of geminiApiKeys) {
                const keyPreview = key.substring(0, 10) + '...';
                for (const model of models) {
                    try {
                        this.logger.info(`Querying Gemini (${model}) with key ${keyPreview}`);
                        const response = await this.callGeminiAPI(key, prompt, model);
                        response.provider = 'gemini';
                        return response;
                    } catch (error: any) {
                        lastError = error;
                        const msg = (error.message || '').toLowerCase();
                        // Quota/rate error — try next model, then next key
                        if (msg.includes('quota') || msg.includes('rate') || msg.includes('resource_exhausted') || msg.includes('429')) {
                            this.logger.warn(`Gemini ${model} (key ${keyPreview}) quota hit, rotating...`);
                            continue;
                        }
                        // Invalid key — skip all models for this key, try next key
                        if (msg.includes('api_key_invalid') || msg.includes('permission_denied') || msg.includes('403')) {
                            this.logger.warn(`Gemini key ${keyPreview} invalid, trying next key...`);
                            break;
                        }
                        // Other error (network, timeout) — don't retry
                        this.logger.error(`Gemini error: ${error.message}`);
                        break;
                    }
                }
            }

            this.logger.error(`All ${geminiApiKeys.length} Gemini keys exhausted. Last: ${lastError?.message}`);
            throw new Error(`All AI providers failed. ${geminiApiKeys.length} Gemini keys tried. Last error: ${lastError?.message}`);
        }

        throw new Error(
            'No AI API keys configured. Set GROQ_API_KEY and/or GEMINI_API_KEYS in .env file.'
        );
    }

    /**
     * Call the Groq API with llama-3.1-8b-instant model.
     */
    private async callGroqAPI(apiKey: string, prompt: string): Promise<AIResponse> {
        const requestBody = JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: this.getSystemPrompt(),
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 2048,
            response_format: { type: 'json_object' },
        });

        const responseText = await this.httpsRequest({
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
        }, requestBody);

        const data = JSON.parse(responseText);

        if (data.error) {
            throw new Error(data.error.message || 'Groq API error');
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from Groq API');
        }

        return this.parseAIResponse(content);
    }

    /**
     * Call the Google Gemini API as fallback.
     * Accepts a model parameter for automatic fallback between models.
     */
    private async callGeminiAPI(apiKey: string, prompt: string, model: string = 'gemini-2.0-flash'): Promise<AIResponse> {
        const requestBody = JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: `${this.getSystemPrompt()}\n\n${prompt}`,
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        });

        const responseText = await this.httpsRequest({
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }, requestBody);

        const data = JSON.parse(responseText);

        if (data.error) {
            throw new Error(data.error.message || 'Gemini API error');
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
            throw new Error('Empty response from Gemini API');
        }

        return this.parseAIResponse(content);
    }

    /**
     * Make an HTTPS request and return the response body.
     */
    private httpsRequest(
        options: https.RequestOptions,
        body: string
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        try {
                            const errorData = JSON.parse(data);
                            reject(new Error(
                                errorData.error?.message ||
                                `HTTP ${res.statusCode}: ${data.substring(0, 200)}`
                            ));
                        } catch {
                            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                        }
                    } else {
                        resolve(data);
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`));
            });

            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Request timed out after 30 seconds'));
            });

            req.write(body);
            req.end();
        });
    }

    /**
     * Parse the AI response text into a structured AIResponse.
     */
    private parseAIResponse(content: string): AIResponse {
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(content);
            return {
                explanation: parsed.explanation || parsed.bug_explanation || parsed.description || 'No explanation provided.',
                suggestedFix: parsed.suggested_fix || parsed.suggestedFix || parsed.fix || 'No fix suggested.',
                improvedCode: parsed.improved_code || parsed.improvedCode || parsed.corrected_code || parsed.code || '',
                exampleInput: parsed.example_input || parsed.exampleInput || '',
                exampleOutput: parsed.example_output || parsed.exampleOutput || '',
                confidence: parsed.confidence || undefined,
            };
        } catch {
            // If JSON parsing fails, extract from markdown-like text
            return this.parseTextResponse(content);
        }
    }

    /**
     * Parse a text-based AI response (fallback when JSON parsing fails).
     */
    private parseTextResponse(text: string): AIResponse {
        const sections: Record<string, string> = {};
        const sectionNames = [
            'explanation', 'bug_explanation', 'description',
            'suggested_fix', 'fix', 'improved_code', 'corrected_code', 'code',
            'example_input', 'example_output',
        ];

        // Try to extract code blocks
        const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
        const codeBlocks: string[] = [];
        let codeBlockMatch;
        while ((codeBlockMatch = codeBlockRegex.exec(text)) !== null) {
            codeBlocks.push(codeBlockMatch[1].trim());
        }

        return {
            explanation: text.split('\n').slice(0, 3).join('\n').trim() || 'Analysis complete.',
            suggestedFix: text.includes('fix') ? text.split('fix')[1]?.split('\n')[0]?.trim() || '' : '',
            improvedCode: codeBlocks[0] || '',
            exampleInput: codeBlocks[1] || '',
            exampleOutput: codeBlocks[2] || '',
        };
    }

    /**
     * Get the system prompt for AI interactions.
     */
    private getSystemPrompt(): string {
        return `You are CodeGuardian AI, an expert multi-language debugging assistant.
You analyze code in JavaScript, TypeScript, Python, HTML, CSS, and Java.
You detect bugs, explain issues, suggest improvements, and provide fixes.

ALWAYS respond in valid JSON with these exact fields:
{
  "explanation": "A clear, detailed explanation of what the code does and any bugs found",
  "suggested_fix": "A concise description of what should be changed to fix bugs",
  "improved_code": "The complete corrected code with bugs fixed",
  "example_input": "An example input that demonstrates the bug (if applicable)",
  "example_output": "The expected output after the fix (if applicable)",
  "confidence": 0.95
}

Rules:
- Be specific about WHY something is a bug
- Provide complete, working corrected code (not just snippets)
- Include language-specific best practices (PEP 8 for Python, etc.)
- If no bugs are found, explain what the code does well
- Keep explanations concise but thorough
- Use proper code formatting in improved_code
- For HTML: check accessibility, semantic correctness, SEO
- For CSS: check specificity issues, browser compat, responsive design
- For Java: check type safety, null handling, resource management
- For Python: check PEP 8, Pythonic idioms, type hints`;
    }

    /**
     * Build the explain code prompt.
     */
    private buildExplainPrompt(code: string, language: string): string {
        return `Analyze and explain the following ${language} code. Identify any bugs, anti-patterns, or potential issues.

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Provide a detailed explanation of what the code does, any bugs or issues found, and how they can be fixed.
Consider ${language}-specific best practices and conventions.`;
    }

    /**
     * Build the fix code prompt.
     */
    private buildFixPrompt(code: string, language: string): string {
        return `Fix all bugs and issues in the following ${language} code. Provide the corrected version.

Code to fix:
\`\`\`${language}
${code}
\`\`\`

Identify all bugs, explain each one, and provide the complete corrected code with all issues resolved.
Follow ${language}-specific conventions and best practices.`;
    }

    /**
     * Build the code suggestion prompt.
     */
    private buildSuggestionPrompt(codeContext: string, language: string): string {
        return `You are an AI code auto-completion engine. Given the following ${language} code context, predict the NEXT 1-3 lines of code the developer is most likely to write.

Code context:
\`\`\`${language}
${codeContext.slice(-800)}
\`\`\`

Rules:
- Output ONLY the next 1-3 lines in the "improved_code" field
- Do NOT repeat any existing code
- Match the existing code style, indentation, and naming conventions
- Be contextually relevant — understand what the developer is building
- For functions: complete the body logic
- For classes: add the next method or property
- For imports: suggest missing imports based on used symbols
- For control flow: complete the branch or loop body
- Keep suggestions concise and immediately useful`;
    }

    /**
     * Build the bug analysis prompt.
     */
    private buildBugAnalysisPrompt(code: string, bugMessage: string, language: string): string {
        return `A bug was detected in the following ${language} code:

Bug detected: "${bugMessage}"

Code:
\`\`\`${language}
${code}
\`\`\`

Explain this specific bug in detail, why it's problematic, and provide the corrected code.`;
    }

    /**
     * Get an API key from VS Code settings or environment.
     */
    private getApiKey(settingKey: string, envKey: string): string {
        // First try VS Code settings
        const config = vscode.workspace.getConfiguration('codeguardian');
        const settingsValue = config.get<string>(settingKey, '');
        if (settingsValue) {
            return settingsValue;
        }

        // Then try environment variable
        const envValue = process.env[envKey];
        if (envValue) {
            return envValue;
        }

        return '';
    }
}
