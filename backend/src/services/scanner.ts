// backend/src/services/scanner.ts
// Pluggable scanner service with security detection rules

import { v4 as uuidv4 } from 'uuid';
import type { Alert, IScannerRule, ScanResult, Severity } from '../types.js';

// ============================================================================
// HELPER: Create alert from match
// ============================================================================

function createAlert(
  filePath: string,
  content: string,
  lineIndex: number,
  column: number,
  matchedText: string,
  rule: IScannerRule,
  message: string,
  proposedFix: string
): Alert {
  return {
    id: uuidv4(),
    filePath,
    severity: rule.severity,
    rule: rule.id,
    message,
    line: lineIndex + 1,
    column: column + 1,
    currentContent: content,
    proposedFix,
    matchedText,
    timestamp: Date.now(),
  };
}

/**
 * Password Detection Rule - MVP Implementation
 * Detects hardcoded passwords in source code (case-insensitive)
 */
export class PasswordDetectionRule implements IScannerRule {
  id = 'password-detection';
  name = 'Hardcoded Password Detection';
  severity: Severity = 'critical';
  description = 'Detects potential hardcoded passwords in source code';

  // Patterns that suggest a password assignment
  private patterns = [
    /password\s*[=:]\s*["'`]([^"'`]+)["'`]/gi,
    /pwd\s*[=:]\s*["'`]([^"'`]+)["'`]/gi,
    /passwd\s*[=:]\s*["'`]([^"'`]+)["'`]/gi,
    /secret\s*[=:]\s*["'`]([^"'`]+)["'`]/gi,
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const pattern of this.patterns) {
        // Reset lastIndex for global regex
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[0];
          const column = match.index;

          // Generate the proposed fix (mask the password value)
          const proposedFix = this.generateFix(content, lineIndex, match.index, matchedText);

          alerts.push({
            id: uuidv4(),
            filePath,
            severity: this.severity,
            rule: this.id,
            message: `Potential hardcoded password detected: "${matchedText.substring(0, 30)}${matchedText.length > 30 ? '...' : ''}"`,
            line: lineIndex + 1, // 1-indexed for display
            column: column + 1,
            currentContent: content,
            proposedFix,
            matchedText,
            timestamp: Date.now(),
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Generate a fix by masking the password value with asterisks
   */
  private generateFix(
    content: string,
    lineIndex: number,
    matchStart: number,
    matchedText: string
  ): string {
    const lines = content.split('\n');
    const line = lines[lineIndex];

    // Find the value portion and mask it
    const valueMatch = matchedText.match(/["'`]([^"'`]+)["'`]/);
    if (valueMatch) {
      const maskedValue = '********';
      const maskedMatch = matchedText.replace(valueMatch[1], maskedValue);
      const newLine =
        line.substring(0, matchStart) +
        maskedMatch +
        line.substring(matchStart + matchedText.length);

      lines[lineIndex] = newLine;
    }

    return lines.join('\n');
  }
}

// ============================================================================
// API KEY DETECTION RULE
// ============================================================================

/**
 * API Key Detection Rule
 * Detects common API keys from popular services
 */
export class ApiKeyDetectionRule implements IScannerRule {
  id = 'api-key-detection';
  name = 'API Key Detection';
  severity: Severity = 'critical';
  description = 'Detects exposed API keys from popular services';

  private patterns: Array<{ name: string; pattern: RegExp; fix: string }> = [
    // AWS
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, fix: 'process.env.AWS_ACCESS_KEY_ID' },
    { name: 'AWS Secret Key', pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g, fix: 'process.env.AWS_SECRET_ACCESS_KEY' },
    
    // OpenAI
    { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48,}/g, fix: 'process.env.OPENAI_API_KEY' },
    
    // Stripe
    { name: 'Stripe Secret Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/g, fix: 'process.env.STRIPE_SECRET_KEY' },
    { name: 'Stripe Publishable Key', pattern: /pk_live_[a-zA-Z0-9]{24,}/g, fix: 'process.env.STRIPE_PUBLISHABLE_KEY' },
    
    // GitHub
    { name: 'GitHub Personal Access Token', pattern: /ghp_[a-zA-Z0-9]{36}/g, fix: 'process.env.GITHUB_TOKEN' },
    { name: 'GitHub OAuth Token', pattern: /gho_[a-zA-Z0-9]{36}/g, fix: 'process.env.GITHUB_OAUTH_TOKEN' },
    { name: 'GitHub App Token', pattern: /ghu_[a-zA-Z0-9]{36}/g, fix: 'process.env.GITHUB_APP_TOKEN' },
    
    // Google
    { name: 'Google API Key', pattern: /AIza[0-9A-Za-z\-_]{35}/g, fix: 'process.env.GOOGLE_API_KEY' },
    
    // Slack
    { name: 'Slack Token', pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g, fix: 'process.env.SLACK_TOKEN' },
    { name: 'Slack Webhook', pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g, fix: 'process.env.SLACK_WEBHOOK_URL' },
    
    // Discord
    { name: 'Discord Bot Token', pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g, fix: 'process.env.DISCORD_BOT_TOKEN' },
    
    // Twilio
    { name: 'Twilio API Key', pattern: /SK[a-f0-9]{32}/g, fix: 'process.env.TWILIO_API_KEY' },
    
    // SendGrid
    { name: 'SendGrid API Key', pattern: /SG\.[a-zA-Z0-9\-_]{22}\.[a-zA-Z0-9\-_]{43}/g, fix: 'process.env.SENDGRID_API_KEY' },
    
    // Mailchimp
    { name: 'Mailchimp API Key', pattern: /[a-f0-9]{32}-us[0-9]{1,2}/g, fix: 'process.env.MAILCHIMP_API_KEY' },
    
    // npm
    { name: 'npm Token', pattern: /npm_[a-zA-Z0-9]{36}/g, fix: 'process.env.NPM_TOKEN' },
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const { name, pattern, fix } of this.patterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[0];
          
          // Skip if it looks like it's already an env var reference
          if (this.isEnvVarReference(line, match.index)) continue;
          
          // Skip if it's in a comment
          if (this.isInComment(line, match.index)) continue;

          const proposedFix = this.generateFix(content, lineIndex, match.index, matchedText, fix);

          alerts.push(createAlert(
            filePath,
            content,
            lineIndex,
            match.index,
            matchedText,
            this,
            `${name} detected: "${matchedText.substring(0, 20)}..."`,
            proposedFix
          ));
        }
      }
    }

    return alerts;
  }

  private isEnvVarReference(line: string, matchIndex: number): boolean {
    const before = line.substring(Math.max(0, matchIndex - 20), matchIndex);
    return /process\.env\.|ENV\[|getenv\(|os\.environ/i.test(before);
  }

  private isInComment(line: string, matchIndex: number): boolean {
    const before = line.substring(0, matchIndex);
    return before.includes('//') || before.includes('#') || before.trim().startsWith('*');
  }

  private generateFix(
    content: string,
    lineIndex: number,
    matchStart: number,
    matchedText: string,
    envVar: string
  ): string {
    const lines = content.split('\n');
    const line = lines[lineIndex];
    
    // Replace the key with environment variable reference
    const newLine = line.substring(0, matchStart) + envVar + line.substring(matchStart + matchedText.length);
    lines[lineIndex] = newLine;

    return lines.join('\n');
  }
}

// ============================================================================
// PRIVATE KEY DETECTION RULE
// ============================================================================

/**
 * Private Key Detection Rule
 * Detects RSA, SSH, and other private keys in source code
 */
export class PrivateKeyDetectionRule implements IScannerRule {
  id = 'private-key-detection';
  name = 'Private Key Detection';
  severity: Severity = 'critical';
  description = 'Detects private keys committed to source code';

  private patterns: Array<{ name: string; pattern: RegExp }> = [
    { name: 'RSA Private Key', pattern: /-----BEGIN RSA PRIVATE KEY-----/g },
    { name: 'DSA Private Key', pattern: /-----BEGIN DSA PRIVATE KEY-----/g },
    { name: 'EC Private Key', pattern: /-----BEGIN EC PRIVATE KEY-----/g },
    { name: 'OpenSSH Private Key', pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g },
    { name: 'PGP Private Key', pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g },
    { name: 'Private Key (Generic)', pattern: /-----BEGIN PRIVATE KEY-----/g },
    { name: 'Encrypted Private Key', pattern: /-----BEGIN ENCRYPTED PRIVATE KEY-----/g },
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Skip .pem, .key files in certain directories (might be intentional)
    if (this.shouldSkipFile(filePath)) return alerts;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const { name, pattern } of this.patterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[0];

          alerts.push(createAlert(
            filePath,
            content,
            lineIndex,
            match.index,
            matchedText,
            this,
            `🔐 ${name} found! This should NEVER be in source code.`,
            this.generateFix(content, lineIndex)
          ));
        }
      }
    }

    return alerts;
  }

  private shouldSkipFile(filePath: string): boolean {
    // Skip test fixtures and example files
    const lowerPath = filePath.toLowerCase();
    return lowerPath.includes('test') && (lowerPath.endsWith('.pem') || lowerPath.endsWith('.key'));
  }

  private generateFix(content: string, lineIndex: number): string {
    const lines = content.split('\n');
    
    // Replace the line with a placeholder comment
    lines[lineIndex] = '// REMOVED: Private key - load from secure location instead';
    
    // Try to remove subsequent lines that are part of the key block
    let i = lineIndex + 1;
    while (i < lines.length && !lines[i].includes('-----END')) {
      lines[i] = '// REMOVED: Key content';
      i++;
    }
    if (i < lines.length && lines[i].includes('-----END')) {
      lines[i] = '// REMOVED: End of private key block';
    }

    return lines.join('\n');
  }
}

// ============================================================================
// JWT TOKEN DETECTION RULE
// ============================================================================

/**
 * JWT Token Detection Rule
 * Detects hardcoded JWT tokens in source code
 */
export class JwtTokenDetectionRule implements IScannerRule {
  id = 'jwt-token-detection';
  name = 'JWT Token Detection';
  severity: Severity = 'high';
  description = 'Detects hardcoded JWT tokens';

  // JWT pattern: header.payload.signature (base64url encoded parts)
  private jwtPattern = /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g;

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      this.jwtPattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = this.jwtPattern.exec(line)) !== null) {
        const matchedText = match[0];
        
        // Skip if it's in a comment or looks like a test/example
        if (this.isInComment(line, match.index)) continue;
        if (this.isTestOrExample(filePath, line)) continue;

        const proposedFix = this.generateFix(content, lineIndex, match.index, matchedText);

        alerts.push(createAlert(
          filePath,
          content,
          lineIndex,
          match.index,
          matchedText,
          this,
          `JWT token detected (${matchedText.length} chars). Tokens should not be hardcoded.`,
          proposedFix
        ));
      }
    }

    return alerts;
  }

  private isInComment(line: string, matchIndex: number): boolean {
    const before = line.substring(0, matchIndex);
    return before.includes('//') || before.includes('#') || before.trim().startsWith('*');
  }

  private isTestOrExample(filePath: string, line: string): boolean {
    const lowerPath = filePath.toLowerCase();
    const lowerLine = line.toLowerCase();
    return (
      lowerPath.includes('test') ||
      lowerPath.includes('spec') ||
      lowerPath.includes('mock') ||
      lowerPath.includes('fixture') ||
      lowerLine.includes('example') ||
      lowerLine.includes('sample')
    );
  }

  private generateFix(
    content: string,
    lineIndex: number,
    matchStart: number,
    matchedText: string
  ): string {
    const lines = content.split('\n');
    const line = lines[lineIndex];
    
    // Replace with environment variable reference
    const newLine = line.substring(0, matchStart) + 
                    'process.env.JWT_TOKEN' + 
                    line.substring(matchStart + matchedText.length);
    lines[lineIndex] = newLine;

    return lines.join('\n');
  }
}

// ============================================================================
// DATABASE CONNECTION STRING DETECTION RULE
// ============================================================================

/**
 * Database Connection String Detection Rule
 * Detects hardcoded database credentials
 */
export class DatabaseConnectionRule implements IScannerRule {
  id = 'database-connection-detection';
  name = 'Database Connection String Detection';
  severity: Severity = 'critical';
  description = 'Detects hardcoded database connection strings with credentials';

  private patterns: Array<{ name: string; pattern: RegExp; envVar: string }> = [
    // MongoDB
    { 
      name: 'MongoDB Connection', 
      pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s"'`]+/gi,
      envVar: 'process.env.MONGODB_URI'
    },
    // PostgreSQL
    { 
      name: 'PostgreSQL Connection', 
      pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@[^\s"'`]+/gi,
      envVar: 'process.env.DATABASE_URL'
    },
    // MySQL
    { 
      name: 'MySQL Connection', 
      pattern: /mysql:\/\/[^:]+:[^@]+@[^\s"'`]+/gi,
      envVar: 'process.env.MYSQL_URL'
    },
    // Redis
    { 
      name: 'Redis Connection', 
      pattern: /redis:\/\/[^:]*:[^@]+@[^\s"'`]+/gi,
      envVar: 'process.env.REDIS_URL'
    },
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const { name, pattern, envVar } of this.patterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[0];
          
          // Skip if already using env var
          if (this.isEnvVarReference(line, match.index)) continue;

          const proposedFix = this.generateFix(content, lineIndex, match.index, matchedText, envVar);

          alerts.push(createAlert(
            filePath,
            content,
            lineIndex,
            match.index,
            matchedText,
            this,
            `${name} string with credentials detected. Use environment variables!`,
            proposedFix
          ));
        }
      }
    }

    return alerts;
  }

  private isEnvVarReference(line: string, matchIndex: number): boolean {
    const before = line.substring(Math.max(0, matchIndex - 20), matchIndex);
    return /process\.env\.|ENV\[|getenv\(|os\.environ/i.test(before);
  }

  private generateFix(
    content: string,
    lineIndex: number,
    matchStart: number,
    matchedText: string,
    envVar: string
  ): string {
    const lines = content.split('\n');
    const line = lines[lineIndex];
    
    const newLine = line.substring(0, matchStart) + envVar + line.substring(matchStart + matchedText.length);
    lines[lineIndex] = newLine;

    return lines.join('\n');
  }
}

// ============================================================================
// EVAL/NEW FUNCTION DETECTION RULE (V1.1)
// ============================================================================

/**
 * Eval Detection Rule
 * Detects dangerous eval() and new Function() usage - potential RCE
 */
export class EvalDetectionRule implements IScannerRule {
  id = 'eval-detection';
  name = 'Eval/new Function() Detection';
  severity: Severity = 'critical';
  description = 'Detects dangerous eval() and new Function() usage that could lead to RCE';

  private patterns: Array<{ name: string; pattern: RegExp; message: string }> = [
    { 
      name: 'eval()', 
      pattern: /\beval\s*\(/g,
      message: 'eval() executes arbitrary code. Use JSON.parse() or a safe alternative.'
    },
    { 
      name: 'new Function()', 
      pattern: /new\s+Function\s*\(/g,
      message: 'new Function() is equivalent to eval(). Avoid dynamic code generation.'
    },
    { 
      name: 'setTimeout with string', 
      pattern: /setTimeout\s*\(\s*["'`]/g,
      message: 'setTimeout with string argument uses eval internally. Pass a function instead.'
    },
    { 
      name: 'setInterval with string', 
      pattern: /setInterval\s*\(\s*["'`]/g,
      message: 'setInterval with string argument uses eval internally. Pass a function instead.'
    },
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip if in a comment
      if (this.isCommentLine(line)) continue;

      for (const { name, pattern, message } of this.patterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[0];
          
          // Skip if it's in a string (documentation)
          if (this.isInString(line, match.index)) continue;

          alerts.push(createAlert(
            filePath,
            content,
            lineIndex,
            match.index,
            matchedText,
            this,
            `⚠️ ${name} detected! ${message}`,
            this.generateFix(content, lineIndex, name)
          ));
        }
      }
    }

    return alerts;
  }

  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
  }

  private isInString(line: string, index: number): boolean {
    // Simple check - count quotes before index
    const before = line.substring(0, index);
    const singleQuotes = (before.match(/'/g) || []).length;
    const doubleQuotes = (before.match(/"/g) || []).length;
    return singleQuotes % 2 === 1 || doubleQuotes % 2 === 1;
  }

  private generateFix(content: string, lineIndex: number, name: string): string {
    const lines = content.split('\n');
    const line = lines[lineIndex];
    
    // Add a comment explaining the issue
    lines[lineIndex] = `// SECURITY: Remove ${name} - ${line.trim()}`;

    return lines.join('\n');
  }
}

// ============================================================================
// CORS WILDCARD DETECTION RULE (V1.1)
// ============================================================================

/**
 * CORS Wildcard Detection Rule
 * Detects overly permissive CORS configurations
 */
export class CorsWildcardRule implements IScannerRule {
  id = 'cors-wildcard-detection';
  name = 'CORS Wildcard Detection';
  severity: Severity = 'high';
  description = 'Detects overly permissive CORS configurations that allow any origin';

  private patterns: Array<{ pattern: RegExp; message: string }> = [
    { 
      pattern: /Access-Control-Allow-Origin['":\s]+['"]\*['"]/gi,
      message: 'CORS header allows all origins. Restrict to specific domains.'
    },
    { 
      pattern: /cors\s*\(\s*\{\s*origin\s*:\s*['"]\*['"]/gi,
      message: 'Express CORS middleware allows all origins. Specify allowed domains.'
    },
    { 
      pattern: /cors\s*\(\s*\{\s*origin\s*:\s*true/gi,
      message: 'CORS origin:true reflects any origin. Use a whitelist instead.'
    },
    { 
      pattern: /res\.header\s*\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]/gi,
      message: 'Setting CORS header to * allows any website to access your API.'
    },
    {
      pattern: /addHeader\s*\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]/gi,
      message: 'CORS header allows all origins. This is a security risk.'
    },
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const { pattern, message } of this.patterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[0];

          alerts.push(createAlert(
            filePath,
            content,
            lineIndex,
            match.index,
            matchedText,
            this,
            `🌐 ${message}`,
            this.generateFix(content, lineIndex, match.index, matchedText)
          ));
        }
      }
    }

    return alerts;
  }

  private generateFix(
    content: string,
    lineIndex: number,
    matchStart: number,
    matchedText: string
  ): string {
    const lines = content.split('\n');
    const line = lines[lineIndex];
    
    // Replace * with a placeholder for specific origin
    const fixedMatch = matchedText.replace(/['"]\*['"]/, 'process.env.ALLOWED_ORIGIN');
    const newLine = line.substring(0, matchStart) + fixedMatch + line.substring(matchStart + matchedText.length);
    lines[lineIndex] = newLine;

    return lines.join('\n');
  }
}

// ============================================================================
// WEAK CRYPTO DETECTION RULE (V1.1)
// ============================================================================

/**
 * Weak Crypto Detection Rule
 * Detects usage of weak/broken cryptographic algorithms
 */
export class WeakCryptoRule implements IScannerRule {
  id = 'weak-crypto-detection';
  name = 'Weak Cryptography Detection';
  severity: Severity = 'high';
  description = 'Detects usage of weak or broken cryptographic algorithms';

  private patterns: Array<{ name: string; pattern: RegExp; recommendation: string }> = [
    { 
      name: 'MD5', 
      pattern: /\b(md5|MD5)\s*\(|createHash\s*\(\s*['"]md5['"]/gi,
      recommendation: 'Use SHA-256 or bcrypt for passwords'
    },
    { 
      name: 'SHA1', 
      pattern: /\b(sha1|SHA1)\s*\(|createHash\s*\(\s*['"]sha1?['"]/gi,
      recommendation: 'Use SHA-256 or stronger'
    },
    { 
      name: 'DES', 
      pattern: /createCipher(?:iv)?\s*\(\s*['"]des['"]/gi,
      recommendation: 'Use AES-256-GCM instead'
    },
    { 
      name: 'RC4', 
      pattern: /createCipher(?:iv)?\s*\(\s*['"]rc4['"]/gi,
      recommendation: 'Use AES-256-GCM instead'
    },
    { 
      name: 'Blowfish (weak key)', 
      pattern: /createCipher(?:iv)?\s*\(\s*['"]bf['"]/gi,
      recommendation: 'Use AES-256-GCM instead'
    },
    {
      name: 'ECB mode',
      pattern: /aes-\d+-ecb|DES-ECB/gi,
      recommendation: 'ECB mode is insecure. Use GCM or CBC with HMAC'
    },
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip comments
      if (this.isCommentLine(line)) continue;

      for (const { name, pattern, recommendation } of this.patterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[0];

          alerts.push(createAlert(
            filePath,
            content,
            lineIndex,
            match.index,
            matchedText,
            this,
            `🔓 Weak crypto: ${name} is broken/deprecated. ${recommendation}`,
            this.generateFix(content, lineIndex)
          ));
        }
      }
    }

    return alerts;
  }

  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
  }

  private generateFix(content: string, lineIndex: number): string {
    const lines = content.split('\n');
    
    // Add a comment with the fix recommendation
    lines[lineIndex] = `// SECURITY: Replace weak crypto - ${lines[lineIndex].trim()}`;

    return lines.join('\n');
  }
}

// ============================================================================
// CONSOLE.LOG SECRETS DETECTION RULE (V1.1)
// ============================================================================

/**
 * Console Secrets Detection Rule
 * Detects console.log statements that might leak sensitive data
 */
export class ConsoleSecretsRule implements IScannerRule {
  id = 'console-secrets-detection';
  name = 'Console.log Secrets Detection';
  severity: Severity = 'medium';
  description = 'Detects console.log statements that might expose sensitive data';

  private sensitiveVars = [
    'password', 'passwd', 'pwd', 'secret', 'token', 'apikey', 'api_key',
    'apiKey', 'auth', 'credential', 'private', 'key', 'bearer', 'jwt',
    'session', 'cookie', 'authorization', 'accessToken', 'refreshToken',
    'access_token', 'refresh_token', 'client_secret', 'clientSecret'
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Build regex pattern for sensitive variable names
    const sensitivePattern = new RegExp(
      `console\\.(log|debug|info|warn|error)\\s*\\([^)]*\\b(${this.sensitiveVars.join('|')})\\b`,
      'gi'
    );

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      sensitivePattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = sensitivePattern.exec(line)) !== null) {
        const matchedText = match[0];
        const sensitiveVar = match[2];

        alerts.push(createAlert(
          filePath,
          content,
          lineIndex,
          match.index,
          matchedText,
          this,
          `📋 Console logging "${sensitiveVar}" - may leak sensitive data in production`,
          this.generateFix(content, lineIndex)
        ));
      }
    }

    return alerts;
  }

  private generateFix(content: string, lineIndex: number): string {
    const lines = content.split('\n');
    
    // Comment out the console.log
    lines[lineIndex] = `// REMOVED: ${lines[lineIndex].trim()} // Potential secret leak`;

    return lines.join('\n');
  }
}

// ============================================================================
// COMMENTED SECRETS DETECTION RULE (V1.1)
// ============================================================================

/**
 * Commented Secrets Detection Rule
 * Detects secrets hidden in comments (old passwords, keys, etc.)
 */
export class CommentedSecretsRule implements IScannerRule {
  id = 'commented-secrets-detection';
  name = 'Commented Secrets Detection';
  severity: Severity = 'medium';
  description = 'Detects secrets hiding in code comments';

  private patterns: Array<{ pattern: RegExp; name: string }> = [
    // Commented password assignments
    { pattern: /\/\/.*password\s*[=:]\s*["'`][^"'`]+["'`]/gi, name: 'commented password' },
    { pattern: /\/\/.*secret\s*[=:]\s*["'`][^"'`]+["'`]/gi, name: 'commented secret' },
    { pattern: /\/\/.*api[_-]?key\s*[=:]\s*["'`][^"'`]+["'`]/gi, name: 'commented API key' },
    { pattern: /\/\/.*token\s*[=:]\s*["'`][^"'`]+["'`]/gi, name: 'commented token' },
    
    // Block comments with secrets
    { pattern: /\/\*[\s\S]*?password\s*[=:]\s*["'`][^"'`]+["'`][\s\S]*?\*\//gi, name: 'commented password (block)' },
    
    // Old credentials markers
    { pattern: /\/\/\s*(old|previous|temp|test)\s*(password|key|secret|token)/gi, name: 'old credential reference' },
    
    // TODO/FIXME with credentials
    { pattern: /\/\/\s*(TODO|FIXME|HACK).*password/gi, name: 'TODO with password reference' },
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const { pattern, name } of this.patterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[0];

          alerts.push(createAlert(
            filePath,
            content,
            lineIndex,
            match.index,
            matchedText,
            this,
            `👻 Found ${name} in comments - secrets persist in git history!`,
            this.generateFix(content, lineIndex)
          ));
        }
      }
    }

    return alerts;
  }

  private generateFix(content: string, lineIndex: number): string {
    const lines = content.split('\n');
    
    // Remove the commented secret entirely
    lines[lineIndex] = '// REMOVED: Commented secret - clean git history with BFG or git-filter-repo';

    return lines.join('\n');
  }
}

// ============================================================================
// COMMAND INJECTION DETECTION RULE (V1.1)
// ============================================================================

/**
 * Command Injection Detection Rule
 * Detects potential command injection vulnerabilities
 */
export class CommandInjectionRule implements IScannerRule {
  id = 'command-injection-detection';
  name = 'Command Injection Detection';
  severity: Severity = 'critical';
  description = 'Detects potential command injection vulnerabilities in exec/spawn calls';

  private patterns: Array<{ pattern: RegExp; message: string }> = [
    // exec with string concatenation
    { 
      pattern: /exec\s*\(\s*[`"'].*\$\{/g,
      message: 'exec() with template literal - potential command injection'
    },
    { 
      pattern: /exec\s*\(\s*[\w]+\s*\+/g,
      message: 'exec() with string concatenation - potential command injection'
    },
    { 
      pattern: /execSync\s*\(\s*[`"'].*\$\{/g,
      message: 'execSync() with template literal - potential command injection'
    },
    
    // spawn with unsanitized input
    { 
      pattern: /spawn\s*\(\s*[\w]+[,\s]/g,
      message: 'spawn() with variable command - verify input is sanitized'
    },
    
    // shell: true is dangerous
    { 
      pattern: /shell\s*:\s*true/g,
      message: 'shell:true enables shell injection. Use spawn with shell:false'
    },
    
    // child_process with user input indicators
    { 
      pattern: /exec\s*\(.*req\.(body|query|params)/g,
      message: 'exec() with request input - HIGH RISK command injection!'
    },
    {
      pattern: /execSync\s*\(.*req\.(body|query|params)/g,
      message: 'execSync() with request input - HIGH RISK command injection!'
    },
  ];

  scan(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip comments
      if (this.isCommentLine(line)) continue;

      for (const { pattern, message } of this.patterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[0];

          alerts.push(createAlert(
            filePath,
            content,
            lineIndex,
            match.index,
            matchedText,
            this,
            `💉 ${message}`,
            this.generateFix(content, lineIndex)
          ));
        }
      }
    }

    return alerts;
  }

  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
  }

  private generateFix(content: string, lineIndex: number): string {
    const lines = content.split('\n');
    
    // Add security comment
    lines[lineIndex] = `// SECURITY REVIEW REQUIRED: ${lines[lineIndex].trim()}`;

    return lines.join('\n');
  }
}

// ============================================================================
// SCANNER SERVICE
// ============================================================================

/**
 * Scanner Service - Orchestrates multiple scanning rules
 * Designed for easy extensibility - just add new rules to the registry
 */
export class ScannerService {
  private rules: Map<string, IScannerRule> = new Map();

  constructor() {
    // Register all security scanning rules
    // CRITICAL severity
    this.registerRule(new PasswordDetectionRule());
    this.registerRule(new ApiKeyDetectionRule());
    this.registerRule(new PrivateKeyDetectionRule());
    this.registerRule(new DatabaseConnectionRule());
    this.registerRule(new EvalDetectionRule());
    this.registerRule(new CommandInjectionRule());
    
    // HIGH severity
    this.registerRule(new JwtTokenDetectionRule());
    this.registerRule(new CorsWildcardRule());
    this.registerRule(new WeakCryptoRule());
    
    // MEDIUM severity
    this.registerRule(new ConsoleSecretsRule());
    this.registerRule(new CommentedSecretsRule());
  }

  /**
   * Register a new scanning rule
   */
  registerRule(rule: IScannerRule): void {
    this.rules.set(rule.id, rule);
    console.log(`[Scanner] Registered rule: ${rule.name} (${rule.id})`);
  }

  /**
   * Unregister a scanning rule
   */
  unregisterRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all registered rules
   */
  getRules(): IScannerRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Scan file content using all registered rules
   */
  scan(content: string, filePath: string): ScanResult {
    const alerts: Alert[] = [];

    // Skip scanning for certain file types
    if (this.shouldSkipFile(filePath)) {
      return {
        alerts: [],
        filePath,
        scannedAt: Date.now(),
      };
    }

    for (const rule of this.rules.values()) {
      try {
        const ruleAlerts = rule.scan(content, filePath);
        alerts.push(...ruleAlerts);
      } catch (error) {
        console.error(`[Scanner] Error in rule ${rule.id}:`, error);
      }
    }

    if (alerts.length > 0) {
      console.log(`[Scanner] Found ${alerts.length} alert(s) in: ${filePath}`);
    }

    return {
      alerts,
      filePath,
      scannedAt: Date.now(),
    };
  }

  /**
   * Check if file should be skipped based on extension or context
   */
  private shouldSkipFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    
    // Skip binary and non-code files
    const skipExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
      '.woff', '.woff2', '.ttf', '.eot',
      '.mp3', '.mp4', '.wav', '.avi',
      '.zip', '.tar', '.gz', '.rar',
      '.pdf', '.doc', '.docx',
      '.lock', '.map',
    ];

    if (skipExtensions.some((ext) => lowerPath.endsWith(ext))) {
      return true;
    }

    // Context awareness: Skip example env files (they're meant to be committed)
    if (lowerPath.endsWith('.env.example') || 
        lowerPath.endsWith('.env.sample') ||
        lowerPath.endsWith('.env.template')) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is in a test context (for reduced severity)
   */
  isTestFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    return (
      lowerPath.includes('/test/') ||
      lowerPath.includes('/tests/') ||
      lowerPath.includes('/__tests__/') ||
      lowerPath.includes('/spec/') ||
      lowerPath.includes('/specs/') ||
      lowerPath.includes('/fixture/') ||
      lowerPath.includes('/fixtures/') ||
      lowerPath.includes('/mock/') ||
      lowerPath.includes('/mocks/') ||
      lowerPath.includes('.test.') ||
      lowerPath.includes('.spec.') ||
      lowerPath.endsWith('_test.ts') ||
      lowerPath.endsWith('_test.js')
    );
  }
}

// Export singleton instance
export const scannerService = new ScannerService();

