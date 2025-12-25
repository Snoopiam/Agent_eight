// backend/src/services/scanner.ts
// Pluggable scanner service with MVP password detection rule

import { v4 as uuidv4 } from 'uuid';
import type { Alert, IScannerRule, ScanResult, Severity } from '../types.js';

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

/**
 * Scanner Service - Orchestrates multiple scanning rules
 * Designed for easy extensibility - just add new rules to the registry
 */
export class ScannerService {
  private rules: Map<string, IScannerRule> = new Map();

  constructor() {
    // Register default MVP rules
    this.registerRule(new PasswordDetectionRule());
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

