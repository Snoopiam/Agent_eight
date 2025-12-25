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
    this.registerRule(new PasswordDetectionRule());
    this.registerRule(new ApiKeyDetectionRule());
    this.registerRule(new PrivateKeyDetectionRule());
    this.registerRule(new JwtTokenDetectionRule());
    this.registerRule(new DatabaseConnectionRule());
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
   * Check if file should be skipped based on extension
   */
  private shouldSkipFile(filePath: string): boolean {
    const skipExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
      '.woff', '.woff2', '.ttf', '.eot',
      '.mp3', '.mp4', '.wav', '.avi',
      '.zip', '.tar', '.gz', '.rar',
      '.pdf', '.doc', '.docx',
      '.lock', '.map',
    ];

    const lowerPath = filePath.toLowerCase();
    return skipExtensions.some((ext) => lowerPath.endsWith(ext));
  }
}

// Export singleton instance
export const scannerService = new ScannerService();

