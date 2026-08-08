# 📖 CodeGuardian AI — User Manual

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Requirements](#2-system-requirements)
3. [Installation Guide](#3-installation-guide)
4. [Configuration](#4-configuration)
5. [Getting Started](#5-getting-started)
6. [Features in Detail](#6-features-in-detail)
7. [Keyboard Shortcuts](#7-keyboard-shortcuts)
8. [Debug Panel Guide](#8-debug-panel-guide)
9. [Code Suggestions](#9-code-suggestions)
10. [Bug History (Supabase)](#10-bug-history-supabase)
11. [Troubleshooting](#11-troubleshooting)
12. [FAQ](#12-faq)

---

## 1. Introduction

**CodeGuardian AI** is an intelligent AI-powered debugging assistant for Visual Studio Code. It combines static code analysis with AI-powered explanations to help developers write better, bug-free JavaScript and TypeScript code.

### What CodeGuardian AI Does

- **Detects bugs in real-time** as you type
- **Explains code issues** using AI (Groq / Gemini)
- **Suggests fixes** with one-click application
- **Provides code suggestions** like GitHub Copilot
- **Stores bug history** for learning and analytics

---

## 2. System Requirements

| Requirement | Minimum |
|-------------|---------|
| VS Code | 1.85.0 or higher |
| Node.js | 18.0 or higher |
| Operating System | Windows, macOS, or Linux |
| Internet | Required for AI features |

### API Keys Needed

| Provider | Purpose | Free Tier |
|----------|---------|-----------|
| **Groq** | Primary AI provider | ✅ Yes (generous limits) |
| **Gemini** | Fallback AI provider | ✅ Yes (free tier available) |
| **Supabase** | Bug history storage | ✅ Yes (optional) |

---

## 3. Installation Guide

### Step 1: Download or Clone

```bash
git clone https://github.com/your-username/codeguardian-ai.git
cd codeguardian-ai
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Compile

```bash
npm run compile
```

### Step 4: Package the Extension

```bash
npm run package
```

This creates a `.vsix` file in the project root.

### Step 5: Install in VS Code

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
3. Type: **"Extensions: Install from VSIX..."**
4. Select the generated `codeguardian-ai-1.0.0.vsix` file
5. Reload VS Code

### Alternative: Development Mode

Press **F5** in VS Code to launch the Extension Development Host for testing.

---

## 4. Configuration

### Getting API Keys

#### Groq API Key (Primary)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to **API Keys**
4. Click **Create API Key**
5. Copy the key

#### Gemini API Key (Fallback)
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key

### Setting Up API Keys

#### Method 1: VS Code Settings (Recommended)
1. Open VS Code Settings (`Ctrl+,`)
2. Search for **"CodeGuardian"**
3. Enter your API keys in the respective fields:
   - `Groq Api Key`: Your Groq API key
   - `Gemini Api Key`: Your Gemini API key

#### Method 2: Environment File
1. Copy `.env.example` to `.env` in the project root
2. Edit the `.env` file:
```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxx
```

### All Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `codeguardian.groqApiKey` | `""` | Your Groq API key |
| `codeguardian.geminiApiKey` | `""` | Your Gemini API key |
| `codeguardian.supabaseUrl` | `""` | Supabase project URL |
| `codeguardian.supabaseAnonKey` | `""` | Supabase anonymous key |
| `codeguardian.enableRealTimeDetection` | `true` | Toggle real-time analysis |
| `codeguardian.enableCodeSuggestions` | `true` | Toggle inline suggestions |
| `codeguardian.debounceDelay` | `1500` | Delay (ms) before analysis |
| `codeguardian.maxCacheSize` | `50` | Max cached responses |

---

## 5. Getting Started

### Your First Analysis

1. Open any `.js` or `.ts` file in VS Code
2. CodeGuardian AI automatically starts analyzing
3. Look for **yellow/red squiggly underlines** (diagnostics)
4. Hover over underlined code to see the issue
5. Click the **💡 lightbulb** icon for Quick Fix options

### Using AI Commands

1. **Select code** in the editor
2. Use one of these methods:
   - Press the keyboard shortcut
   - Right-click → CodeGuardian menu
   - Press `Ctrl+Shift+P` → Type "CodeGuardian"

---

## 6. Features in Detail

### 6.1 Real-Time Bug Detection

CodeGuardian scans your code for these bug categories:

| Category | Examples |
|----------|----------|
| **Best Practice** | `==` vs `===`, `var` usage |
| **Null Safety** | Loose null comparisons |
| **Async/Await** | Missing await, async without await |
| **Error Handling** | Empty catch blocks, unhandled promises |
| **Security** | eval() usage, innerHTML XSS risks |
| **Code Quality** | Unused variables, TODO comments, magic numbers |
| **Performance** | Uncleared intervals/timeouts |
| **Debug** | Leftover debugger statements, console.log |

### 6.2 AI-Powered Explain Code

1. Select problematic or unclear code
2. Press `Ctrl+Shift+E` or use Command Palette: **"CodeGuardian: Explain Selected Code"**
3. The Debug Panel opens with:
   - Detailed explanation of what the code does
   - Identified bugs and anti-patterns
   - Suggestions for improvement

### 6.3 AI-Powered Fix Code

1. Select buggy code
2. Press `Ctrl+Shift+F` or use Command Palette: **"CodeGuardian: Fix Selected Code"**
3. The Debug Panel opens with:
   - Bug explanation
   - Suggested fix description
   - Complete corrected code
   - Click **"🚀 Apply Fix"** to replace code in editor

### 6.4 Quick Fix (Code Actions)

When CodeGuardian detects a bug:
1. A **💡 lightbulb** appears next to the code
2. Click it to see fix options:
   - **Pattern-based fix**: Instant replacement (e.g., `==` → `===`)
   - **AI Explain**: Get detailed AI explanation
   - **AI Fix**: Get AI-generated corrected code

---

## 7. Keyboard Shortcuts

| Shortcut | macOS | Action |
|----------|-------|--------|
| `Ctrl+Shift+E` | `Cmd+Shift+E` | Explain selected code |
| `Ctrl+Shift+F` | `Cmd+Shift+F` | Fix selected code |
| `Ctrl+Shift+D` | `Cmd+Shift+D` | Open Debug Panel |
| `Ctrl+Shift+S` | `Cmd+Shift+S` | Suggest next line |

---

## 8. Debug Panel Guide

The Debug Panel is a custom webview that displays AI analysis results.

### Sections

1. **🔍 Original Code** — The code you selected for analysis
2. **💡 AI Explanation** — Detailed explanation of the code and issues
3. **🔧 Suggested Fix** — Description of what needs to change
4. **✨ Improved Code** — Complete corrected version with:
   - 📋 **Copy** button — copies to clipboard
   - 🚀 **Apply Fix** button — replaces selected code in editor
5. **📊 Example I/O** — Sample input and expected output

### Tips
- The panel opens **beside** your editor
- Click section headers to **collapse/expand** sections
- The panel persists content when switching between files

---

## 9. Code Suggestions

CodeGuardian provides GitHub Copilot-like inline suggestions:

1. Type code normally in a `.js` or `.ts` file
2. Pause briefly — a ghost text suggestion appears
3. Press **Tab** to accept the suggestion
4. Press **Escape** to dismiss

You can also manually trigger suggestions:
- Press `Ctrl+Shift+S` to insert the next suggested line

### Note
- Suggestions are rate-limited to avoid excessive API calls
- Results are cached for repeated contexts
- Can be disabled in settings: `codeguardian.enableCodeSuggestions`

---

## 10. Bug History (Supabase)

Optionally store all queries and fixes in Supabase for tracking:

### Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and run:

```sql
CREATE TABLE IF NOT EXISTS bug_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    query_type TEXT NOT NULL CHECK (query_type IN ('explain', 'fix', 'suggest')),
    code_snippet TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    language TEXT DEFAULT 'javascript/typescript',
    bug_category TEXT DEFAULT 'general'
);

ALTER TABLE bug_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON bug_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous reads" ON bug_history
    FOR SELECT USING (true);
```

4. Add your Supabase URL and anon key to settings

---

## 11. Troubleshooting

### "No AI API keys configured"
→ Add your Groq or Gemini API key in Settings or `.env` file.

### "Both AI providers failed"
→ Check internet connection. Verify API keys are valid. Check Output panel (View → Output → CodeGuardian AI) for details.

### No diagnostics appearing
→ Ensure the file is `.js`, `.ts`, `.jsx`, or `.tsx`. Check that `enableRealTimeDetection` is `true` in settings.

### Debug Panel is blank
→ Try closing and reopening with `Ctrl+Shift+D`. Check Output panel for errors.

### Extension not activating
→ Ensure VS Code version is 1.85.0+. Try reloading window (`Ctrl+Shift+P` → "Developer: Reload Window").

---

## 12. FAQ

**Q: Is CodeGuardian AI free?**
A: Yes! The extension itself is free. AI features use free-tier APIs from Groq and Google Gemini.

**Q: Do I need both API keys?**
A: No. You need at least one. Groq is recommended as primary. Gemini serves as automatic fallback.

**Q: Is my code sent to external servers?**
A: Code snippets are sent to Groq/Gemini APIs for analysis. No code is stored on external servers beyond the API request.

**Q: Can I use it offline?**
A: Real-time bug detection works offline. AI features (explain, fix, suggest) require internet.

**Q: Which AI model is used?**
A: Groq uses `llama-3.1-8b-instant`. Gemini uses `gemini-2.0-flash`.

---

<div align="center">

**Need help?** Open an issue on GitHub or check the Output panel for logs.

**CodeGuardian AI** — Protecting your code, one bug at a time. 🛡️

</div>
