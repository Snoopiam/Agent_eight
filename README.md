# Agent Eight

> Local-First Security Scanner for Developers

Agent Eight is a real-time code analysis tool that watches your files for security vulnerabilities and helps you fix them instantly. **11 detection rules** catch secrets, injection attacks, and insecure patterns before they reach production.

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🚀 AGENT EIGHT v1.1                                      ║
║                                                              ║
║     The Engine (Backend)  ←→  The Cockpit (Frontend)        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

## Features

- **Real-time File Watching**: Monitors your project files with 500ms debounced scanning
- **11 Security Rules**: Passwords, API keys, injection attacks, weak crypto, and more
- **Visual Diff Review**: Side-by-side comparison of current vs. proposed fixes
- **One-Click Fixes**: Apply security fixes directly from the dashboard
- **Context Awareness**: Smart filtering for test files and example configs
- **Pluggable Architecture**: Easy to add new scanning rules

## What It Detects

| Severity | Rules |
|----------|-------|
| 🔴 **CRITICAL** | Passwords, API Keys (12 services), Private Keys, Database URLs, `eval()`, Command Injection |
| 🟠 **HIGH** | JWT Tokens, CORS Wildcards, Weak Crypto (MD5/SHA1) |
| 🟡 **MEDIUM** | Console.log Secrets, Commented Secrets |

## Architecture

| Component | Technology | Port |
|-----------|------------|------|
| **The Engine** (Backend) | Node.js + Express + Socket.io + Chokidar | 3001 |
| **The Cockpit** (Frontend) | Next.js + Tailwind CSS + React-Diff-Viewer | 3000 |
| **Communication** | Socket.io (bi-directional real-time) | - |

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Clone and enter the project
cd agent-eight

# Install all dependencies (root, backend, frontend)
npm run install:all
```

### Running

```bash
# Start both servers concurrently
npm run dev
```

Or run each server separately:

```bash
# Terminal 1 - Backend (The Engine)
cd backend
npm run dev

# Terminal 2 - Frontend (The Cockpit)
cd frontend
npm run dev
```

### Usage

1. Open **The Cockpit** at [http://localhost:3000](http://localhost:3000)
2. The Engine will watch your project directory by default
3. Edit any file and add something like `password = "secret123"`
4. Watch the alert appear in the dashboard
5. Review the proposed fix and click **Fix It**

## Configuration

### Watch Directory

Set the directory to watch via environment variable or CLI argument:

```bash
# Environment variable
WATCH_DIR=/path/to/project npm run dev:backend

# CLI argument
cd backend && npm run dev -- /path/to/project
```

### Environment Variables

**Backend (.env)**
```
PORT=3001
WATCH_DIR=./
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Project Structure

```
agent-eight/
├── backend/                    # The Engine
│   ├── src/
│   │   ├── index.ts           # Server entry point
│   │   ├── watcher.ts         # File watcher (Chokidar)
│   │   ├── services/
│   │   │   ├── scanner.ts     # Scanning rules
│   │   │   └── fixer.ts       # Fix application
│   │   └── types.ts           # Type re-exports
│   └── package.json
│
├── frontend/                   # The Cockpit
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   └── lib/               # Utilities
│   └── package.json
│
├── shared/
│   └── types.ts               # Shared TypeScript types
│
├── .cursorrules               # Cursor AI context
└── README.md
```

## Adding Custom Rules

Create a new rule by implementing the `IScannerRule` interface:

```typescript
// backend/src/services/scanner.ts
export class CustomRule implements IScannerRule {
  id = 'custom-rule';
  name = 'Custom Security Rule';
  severity: Severity = 'high';
  description = 'Detects custom security issues';

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    // Your detection logic here
    return alerts;
  }
}

// Register the rule
scannerService.registerRule(new CustomRule());
```

## Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `scan:result` | Server → Client | `ScanResult` (alerts array) |
| `fix:apply` | Client → Server | `FixPayload` (file + replacement) |
| `fix:complete` | Server → Client | `FixResponse` (success) |
| `fix:error` | Server → Client | `FixResponse` (error) |

## Development

```bash
# Type checking
npm run typecheck

# Build for production
npm run build
```

## License

MIT

