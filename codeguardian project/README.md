# 🛡️ CodeGuardian AI

<div align="center">

**An intelligent AI-powered debugging assistant for Visual Studio Code**

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visual-studio-code)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![AI Powered](https://img.shields.io/badge/AI-Groq%20%2B%20Gemini-orange)](https://groq.com)

</div>

---

## ✨ Features

### 🔍 Real-Time Bug Detection
Automatically detects common JavaScript/TypeScript bugs as you type:
- **Loose equality** (`==` vs `===`)
- **Null/undefined** safety issues
- **Unused variables** detection
- **Async/await** misuse patterns
- **Empty catch blocks** and silent error swallowing
- **Security risks** (eval, innerHTML XSS)
- **var usage** (should be `let`/`const`)
- **console.log** statements left in code
- **Debugger statements** left in production code
- And **10+ more patterns**

### 🤖 AI-Powered Explanations
Get detailed, context-aware explanations for any code snippet:
- Powered by **Groq (llama-3.1-8b-instant)** as primary AI
- Automatic **Gemini fallback** if Groq is unavailable
- Structured responses with explanation, fix, and improved code

### ⚡ Quick Fix Code Actions
One-click fixes directly in your editor:
- Pattern-based instant fixes (e.g., `==` → `===`)
- AI-powered comprehensive fixes
- Apply improved code from the Debug Panel

### 📊 Debug Panel (Webview)
A beautiful, dark-mode webview panel showing:
- 🔍 Original code
- 💡 AI explanation
- 🔧 Suggested fix
- ✨ Improved code
- 📊 Example input/output

### 💡 Code Suggestions
Copilot-like inline suggestions:
- AI-powered "next best line" predictions
- Ghost text in the editor
- Context-aware suggestions

### 📦 Bug History (Optional)
Store all queries and fixes in **Supabase** for tracking and analytics.

---

## 🚀 Quick Start

### 1. Install the Extension

```bash
# Clone the repository
git clone https://github.com/your-username/codeguardian-ai.git
cd codeguardian-ai

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npm run package
```

Then install the `.vsix` file:
- Open VS Code
- Press `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
- Select the generated `.vsix` file

### 2. Configure API Keys

**Option A: VS Code Settings**
1. Open Settings (`Ctrl+,`)
2. Search for "CodeGuardian"
3. Enter your **Groq API Key** and/or **Gemini API Key**

**Option B: Environment File**
1. Copy `.env.example` to `.env`
2. Fill in your API keys:
```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Get Your API Keys
- **Groq** (Primary): [console.groq.com](https://console.groq.com) — Free tier available
- **Gemini** (Fallback): [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — Free tier available

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Command | Description |
|----------|---------|-------------|
| `Ctrl+Shift+E` | Explain Code | AI-powered code explanation |
| `Ctrl+Shift+F` | Fix Code | AI-powered code fix |
| `Ctrl+Shift+D` | Debug Panel | Open the CodeGuardian panel |
| `Ctrl+Shift+S` | Suggest Line | Get next line suggestion |

---

## 🔧 Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `codeguardian.groqApiKey` | string | `""` | Groq API key (primary AI) |
| `codeguardian.geminiApiKey` | string | `""` | Gemini API key (fallback AI) |
| `codeguardian.enableRealTimeDetection` | boolean | `true` | Enable real-time bug detection |
| `codeguardian.enableCodeSuggestions` | boolean | `true` | Enable inline code suggestions |
| `codeguardian.debounceDelay` | number | `1500` | Debounce delay (ms) for analysis |
| `codeguardian.maxCacheSize` | number | `50` | Max cached AI responses |
| `codeguardian.supabaseUrl` | string | `""` | Supabase URL (optional) |
| `codeguardian.supabaseAnonKey` | string | `""` | Supabase anon key (optional) |

---

## 📁 Project Structure

```
codeguardian-ai/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── analyzers/
│   │   └── bugDetector.ts        # Static analysis engine
│   ├── services/
│   │   ├── aiService.ts          # Groq + Gemini AI integration
│   │   └── supabaseService.ts    # Bug history storage
│   ├── providers/
│   │   ├── codeActionProvider.ts  # Quick Fix actions
│   │   └── codeSuggestionProvider.ts # Inline suggestions
│   ├── ui/
│   │   └── debugPanel.ts         # Webview panel UI
│   ├── utils/
│   │   ├── cache.ts              # Response caching (LRU)
│   │   ├── config.ts             # Configuration loader
│   │   ├── debounce.ts           # Debounce/throttle utils
│   │   └── logger.ts             # Logging utility
│   └── types/
│       └── index.ts              # TypeScript interfaces
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript config
├── .env.example                   # Environment template
├── README.md                      # This file
├── USER_MANUAL.md                 # Detailed user guide
└── PROJECT_REPORT.md              # Academic project report
```

---

## 🔑 Security

- API keys are **never exposed** in code or logs
- Keys stored in VS Code's secure settings or `.env` file
- `.env` file is in `.gitignore` — never committed
- Webview uses Content Security Policy nonces
- All API calls use HTTPS
- Input is sanitized before display in webview

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────┐
│              VS Code Editor                │
│  ┌──────────────────────────────────────┐  │
│  │         Bug Detector (Static)        │  │
│  │    Analyzes code on every change     │  │
│  └──────────────┬───────────────────────┘  │
│                 │                           │
│  ┌──────────────▼───────────────────────┐  │
│  │         Diagnostics Engine           │  │
│  │   Reports issues as warnings/errors  │  │
│  └──────────────┬───────────────────────┘  │
│                 │                           │
│  ┌──────────────▼───────────────────────┐  │
│  │       Code Action Provider           │  │
│  │    Quick Fix suggestions (💡)        │  │
│  └──────────────┬───────────────────────┘  │
│                 │                           │
│  ┌──────────────▼───────────────────────┐  │
│  │          AI Service                  │  │
│  │   Groq (primary) → Gemini (fallback) │  │
│  └──────────────┬───────────────────────┘  │
│                 │                           │
│  ┌──────────────▼───────────────────────┐  │
│  │        Debug Panel (Webview)         │  │
│  │  Shows explanation, fix, code, I/O   │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

---

## 🧑‍💻 Development

```bash
# Install dependencies
npm install

# Watch mode (auto-recompile)
npm run watch

# Run in VS Code
# Press F5 to launch Extension Development Host

# Lint
npm run lint

# Package for distribution
npm run package
```

---

## 📝 Supported Languages

- JavaScript (`.js`)
- TypeScript (`.ts`)
- JavaScript React (`.jsx`)
- TypeScript React (`.tsx`)

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with 🛡️ by CodeGuardian Team**

</div>
