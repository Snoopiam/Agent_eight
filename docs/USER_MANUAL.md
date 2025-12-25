# Agent Eight User Manual

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     █████╗  ██████╗ ███████╗███╗   ██╗████████╗     █████╗                   ║
║    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ██╔══██╗                  ║
║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       ╚█████╔╝                  ║
║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██╔══██╗                  ║
║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ╚█████╔╝                  ║
║    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝        ╚════╝                   ║
║                                                                              ║
║                    LOCAL-FIRST SECURITY SIDECAR                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Table of Contents

1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [The Cockpit Interface](#the-cockpit-interface)
6. [Working with Alerts](#working-with-alerts)
7. [Applying Fixes](#applying-fixes)
8. [Configuration](#configuration)
9. [Security Rules](#security-rules)
10. [Troubleshooting](#troubleshooting)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [FAQ](#faq)

---

## Introduction

**Agent Eight** is a local-first development sidecar application that monitors your codebase in real-time for security vulnerabilities and helps you fix them instantly.

### Key Features

- **Real-time Monitoring**: Automatically scans files as you save them
- **Instant Alerts**: Get notified immediately when security issues are detected
- **Visual Diff Review**: See exactly what changes will be made before applying
- **One-Click Fixes**: Apply security fixes directly from the dashboard
- **Privacy First**: Everything runs locally—no data leaves your machine

### Architecture Overview

Agent Eight consists of two components:

| Component | Name | Description |
|-----------|------|-------------|
| **Backend** | The Engine | Watches files, scans for issues, applies fixes |
| **Frontend** | The Cockpit | Visual dashboard for reviewing and managing alerts |

---

## System Requirements

### Minimum Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher
- **RAM**: 512 MB available
- **Disk Space**: 200 MB for installation

### Recommended

- **Node.js**: Version 20.x LTS
- **RAM**: 1 GB available
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Checking Your Node.js Version

```bash
node --version
# Should output v18.0.0 or higher

npm --version
# Should output 9.0.0 or higher
```

---

## Installation

### Step 1: Clone or Download

If you received Agent Eight as a zip file, extract it to your preferred location.

If using git:
```bash
git clone <repository-url> agent-eight
cd agent-eight
```

### Step 2: Install Dependencies

From the project root directory, run:

```bash
npm run install:all
```

This command installs dependencies for:
- The root project (concurrently for running both servers)
- The Engine (backend)
- The Cockpit (frontend)

### Step 3: Verify Installation

```bash
# Check that both projects are ready
cd backend && npm run typecheck && cd ..
cd frontend && npm run typecheck && cd ..
```

If no errors appear, installation is complete.

---

## Quick Start

### Starting Agent Eight

From the project root directory:

```bash
npm run dev
```

This starts both:
- **The Engine** on `http://localhost:3001`
- **The Cockpit** on `http://localhost:3000`

### Opening The Cockpit

1. Open your web browser
2. Navigate to `http://localhost:3000`
3. You should see the Agent Eight dashboard

### Your First Scan

1. The Engine watches the `backend/` directory by default
2. Create a test file with a security issue:

```javascript
// test-config.js
const config = {
  password = "mysecretpassword",
  apiKey: "sk-123456789"
};
```

3. Save the file
4. Watch the alert appear in The Cockpit within 1 second

---

## The Cockpit Interface

### Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] AGENT EIGHT          [Watch Dir]  [Status]  [Alerts]    │
├─────────────────────┬───────────────────────────────────────────┤
│                     │                                           │
│    ALERT FEED       │           ALERT DETAIL                    │
│                     │                                           │
│  ┌───────────────┐  │  ┌─────────────────────────────────────┐  │
│  │ CRITICAL      │  │  │ Severity Badge   Rule Name          │  │
│  │ filename.js   │  │  │ File Path        Line:Column        │  │
│  │ Message...    │  │  │                                     │  │
│  └───────────────┘  │  │ Detection Message                   │  │
│                     │  │                                     │  │
│  ┌───────────────┐  │  ├─────────────────────────────────────┤  │
│  │ HIGH          │  │  │ PROPOSED CHANGES                    │  │
│  │ config.ts     │  │  │ ┌───────────┬───────────┐           │  │
│  │ Message...    │  │  │ │ Current   │ After Fix │           │  │
│  └───────────────┘  │  │ │           │           │           │  │
│                     │  │ └───────────┴───────────┘           │  │
│                     │  ├─────────────────────────────────────┤  │
│                     │  │ [Dismiss]              [Fix It]     │  │
│                     │  └─────────────────────────────────────┘  │
└─────────────────────┴───────────────────────────────────────────┘
```

### Header Bar

| Element | Description |
|---------|-------------|
| **Logo** | Agent Eight branding with "THE COCKPIT" subtitle |
| **Watch Directory** | Shows the directory currently being monitored |
| **Connection Status** | Green dot = connected, Red dot = disconnected |
| **Alert Count** | Red badge showing number of active alerts |
| **Clear Button** | Removes all alerts from the feed |

### Alert Feed (Left Panel)

The Alert Feed displays all detected security issues in a scrollable list.

Each alert card shows:
- **Severity Badge**: Color-coded (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- **Filename**: Name of the affected file
- **Path**: Relative path to the file
- **Message**: Brief description of the issue
- **Location**: Line and column number
- **Timestamp**: How long ago the alert was created

### Alert Detail (Right Panel)

When you select an alert, the detail view shows:

1. **Header Section**
   - Full severity badge and rule name
   - Complete file path with line:column
   - Detailed description of the issue

2. **Diff Viewer**
   - Side-by-side comparison of current vs. proposed changes
   - Red highlighting for removed content
   - Green highlighting for added content
   - Toggle to show full file or just changes

3. **Action Bar**
   - Explanation of what the fix will do
   - Dismiss button (removes alert without fixing)
   - Fix It button (applies the proposed change)

---

## Working with Alerts

### Understanding Severity Levels

| Severity | Color | Description |
|----------|-------|-------------|
| **CRITICAL** | Red | Immediate security risk, fix required |
| **HIGH** | Orange | Serious vulnerability, should be fixed soon |
| **MEDIUM** | Yellow | Moderate risk, plan to address |
| **LOW** | Green | Minor issue, fix when convenient |
| **INFO** | Blue | Informational, best practice suggestion |

### Selecting an Alert

1. Click on any alert in the Alert Feed
2. The alert will be highlighted with a left border
3. The Alert Detail panel will show the full information

### Reviewing the Diff

The diff viewer shows exactly what will change:

```
┌─────────────────────────┬─────────────────────────┐
│ Current                 │ After Fix               │
├─────────────────────────┼─────────────────────────┤
│ 1   const config = {    │ 1   const config = {    │
│ 2 - password = "secret" │ 2 + password = "****"   │
│ 3   };                  │ 3   };                  │
└─────────────────────────┴─────────────────────────┘
```

- **Red rows (-)**: Lines that will be removed/changed
- **Green rows (+)**: New content that will be added
- **White rows**: Unchanged context lines

### Show Full File Toggle

Click "Show Full File" to see the entire file content instead of just the changed lines. This helps you understand the context of the change.

---

## Applying Fixes

### Before Applying a Fix

1. **Review the diff carefully** — Make sure you understand what will change
2. **Check the surrounding context** — Use "Show Full File" if needed
3. **Ensure no unsaved changes** — The fixer checks if the file was modified since scanning

### Applying a Fix

1. Select the alert you want to fix
2. Review the proposed changes in the diff viewer
3. Click the **Fix It** button (green button in bottom right)
4. The button will show "Applying..." while processing
5. On success:
   - The file is updated on disk
   - The alert is removed from the feed
   - The file is re-scanned automatically

### Fix Verification

After applying a fix:
1. Check that the alert disappeared from the feed
2. Open the file in your editor to verify the change
3. If the same pattern exists elsewhere, new alerts may appear

### If a Fix Fails

Common reasons for fix failures:
- **File was modified** — The file changed since the scan
- **Permission denied** — Agent Eight can't write to the file
- **File deleted** — The file no longer exists

When a fix fails, an error message appears. Dismiss the alert and wait for the file to be re-scanned, or manually fix the issue.

---

## Configuration

### Environment Variables

#### Backend (The Engine)

Create a `.env` file in the `backend/` directory:

```env
# Server port (default: 3001)
PORT=3001

# Directory to watch (default: current directory)
WATCH_DIR=/path/to/your/project

# Frontend URL for CORS (default: http://localhost:3000)
FRONTEND_URL=http://localhost:3000
```

#### Frontend (The Cockpit)

Create a `.env.local` file in the `frontend/` directory:

```env
# Backend Socket URL (default: http://localhost:3001)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Watching a Different Directory

#### Method 1: Environment Variable

```bash
WATCH_DIR=/path/to/project npm run dev:backend
```

#### Method 2: Command Line Argument

```bash
cd backend
npm run dev -- /path/to/project
```

#### Method 3: Permanent Configuration

Edit `backend/.env`:
```env
WATCH_DIR=/path/to/your/project
```

### Ignored Paths

By default, Agent Eight ignores:
- `node_modules/`
- `.git/`
- `dist/` and `build/`
- `.next/`
- `coverage/`
- `.cache/`
- `*.log` files

These patterns are configured in `backend/src/watcher.ts`.

---

## Security Rules

### Current Rules

#### Password Detection Rule

**ID**: `password-detection`  
**Severity**: CRITICAL  
**Description**: Detects hardcoded passwords in source code

**Patterns Detected**:
- `password = "value"`
- `password: "value"`
- `pwd = "value"`
- `passwd = "value"`
- `secret = "value"`

**Fix Applied**: Replaces the password value with `********`

### Adding Custom Rules

To add a new scanning rule:

1. Open `backend/src/services/scanner.ts`
2. Create a new class implementing `IScannerRule`:

```typescript
export class ApiKeyDetectionRule implements IScannerRule {
  id = 'api-key-detection';
  name = 'API Key Detection';
  severity: Severity = 'high';
  description = 'Detects exposed API keys';

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    
    // Your detection logic here
    const pattern = /api[_-]?key\s*[=:]\s*["'`]([^"'`]+)["'`]/gi;
    
    // ... implementation
    
    return alerts;
  }
}
```

3. Register the rule in the `ScannerService` constructor:

```typescript
constructor() {
  this.registerRule(new PasswordDetectionRule());
  this.registerRule(new ApiKeyDetectionRule()); // Add this line
}
```

4. Restart The Engine

---

## Troubleshooting

### Connection Issues

#### "Disconnected" Status in Header

**Symptoms**: Red dot, "Disconnected" text, no alerts appearing

**Solutions**:
1. Check that The Engine is running:
   ```bash
   curl http://localhost:3001/health
   ```
2. Verify the backend port is correct
3. Check for CORS errors in browser console
4. Restart both servers

#### Alerts Not Appearing

**Symptoms**: Connected but no alerts when saving files with issues

**Solutions**:
1. Verify the watch directory is correct (shown in header)
2. Check the file isn't in an ignored directory
3. Ensure the file type isn't skipped (binary, images, etc.)
4. Check The Engine console for errors
5. Verify the pattern matches the detection rules

### Fix Issues

#### "File has been modified" Error

**Cause**: The file changed between scan and fix attempt

**Solution**: 
1. Dismiss the alert
2. Wait for re-scan (or save the file again)
3. Try applying the fix to the new alert

#### "Permission denied" Error

**Cause**: Agent Eight can't write to the file

**Solutions**:
1. Check file permissions
2. Ensure the file isn't open in another program with exclusive lock
3. Run with appropriate permissions

### Performance Issues

#### High CPU Usage

**Solutions**:
1. Increase debounce time in `backend/src/watcher.ts`
2. Add more patterns to the ignore list
3. Watch a more specific subdirectory

#### Slow Alert Display

**Solutions**:
1. Clear old alerts periodically
2. Check browser console for React errors
3. Refresh the page

### Resetting Agent Eight

To reset to a clean state:

```bash
# Stop all servers (Ctrl+C)

# Clear node_modules and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install:all

# Restart
npm run dev
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Dismiss selected alert / Close detail panel |
| `↑` / `↓` | Navigate through alert feed |
| `Enter` | Select highlighted alert |

*Note: Keyboard navigation is planned for future releases*

---

## FAQ

### General Questions

**Q: Does Agent Eight send my code to the cloud?**  
A: No. Agent Eight runs entirely on your local machine. No code or data is transmitted externally.

**Q: Can I use Agent Eight on multiple projects?**  
A: Yes. Change the `WATCH_DIR` environment variable or use the command line argument to switch projects.

**Q: What file types does Agent Eight scan?**  
A: Agent Eight scans all text-based files by default, excluding binary files like images, fonts, and archives.

### Security Questions

**Q: Is it safe to use the "Fix It" feature?**  
A: The fix feature shows you exactly what will change before applying. Always review the diff before clicking Fix It.

**Q: What if a fix breaks my code?**  
A: Use your version control system (git) to revert changes. Always commit your work before applying batch fixes.

### Technical Questions

**Q: Can I run Agent Eight alongside other file watchers?**  
A: Yes, but be aware that multiple watchers may cause performance issues or conflicting file locks.

**Q: How do I add support for a new language or framework?**  
A: Add custom scanning rules in `backend/src/services/scanner.ts`. Rules are pattern-based and language-agnostic.

**Q: Why do alerts reappear after I fixed them?**  
A: The MVP password rule masks values with `********` which still matches the pattern. A future update will provide smarter fixes that fully remediate the issue.

---

## Support

### Getting Help

1. Check this User Manual
2. Review the [README.md](../README.md)
3. Check [.cursorrules](../.cursorrules) for development context
4. Open an issue on the project repository

### Reporting Bugs

When reporting bugs, include:
- Operating system and version
- Node.js version (`node --version`)
- Steps to reproduce
- Expected vs actual behavior
- Console logs from both Engine and Cockpit

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12 | Initial MVP release |

---

*Agent Eight - Local-First Security for Modern Development*

