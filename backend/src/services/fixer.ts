// backend/src/services/fixer.ts
// File remediation service with defensive error handling

import fs from 'fs/promises';
import path from 'path';
import type { FixPayload, FixResponse } from '../types.js';

export class FixerService {
  /**
   * Apply a fix to a file
   * Defensive implementation with comprehensive error handling
   */
  async applyFix(payload: FixPayload): Promise<FixResponse> {
    const { alertId, filePath, originalContent, replacementContent } = payload;

    try {
      // Validate inputs
      if (!filePath || typeof filePath !== 'string') {
        return {
          success: false,
          filePath: filePath || 'unknown',
          alertId,
          error: 'Invalid file path provided',
        };
      }

      if (!replacementContent || typeof replacementContent !== 'string') {
        return {
          success: false,
          filePath,
          alertId,
          error: 'Invalid replacement content provided',
        };
      }

      // Normalize the file path
      const normalizedPath = path.resolve(filePath);

      // Check if file exists
      try {
        await fs.access(normalizedPath, fs.constants.R_OK | fs.constants.W_OK);
      } catch {
        return {
          success: false,
          filePath: normalizedPath,
          alertId,
          error: 'File does not exist or is not accessible',
        };
      }

      // Read current content to verify it hasn't changed
      const currentContent = await fs.readFile(normalizedPath, 'utf-8');
      
      if (currentContent !== originalContent) {
        return {
          success: false,
          filePath: normalizedPath,
          alertId,
          error: 'File has been modified since the scan. Please review the new content.',
        };
      }

      // Write the replacement content
      await fs.writeFile(normalizedPath, replacementContent, 'utf-8');

      console.log(`[Fixer] Successfully applied fix to: ${normalizedPath}`);

      return {
        success: true,
        filePath: normalizedPath,
        alertId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`[Fixer] Error applying fix to ${filePath}:`, errorMessage);

      return {
        success: false,
        filePath,
        alertId,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate that the fix can be applied safely
   */
  async validateFix(payload: FixPayload): Promise<{ valid: boolean; reason?: string }> {
    const { filePath, originalContent } = payload;

    try {
      const normalizedPath = path.resolve(filePath);

      // Check file exists and is readable
      try {
        await fs.access(normalizedPath, fs.constants.R_OK);
      } catch {
        return { valid: false, reason: 'File is not accessible' };
      }

      // Verify content matches
      const currentContent = await fs.readFile(normalizedPath, 'utf-8');
      if (currentContent !== originalContent) {
        return { valid: false, reason: 'File content has changed since scan' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }
}

// Export singleton instance
export const fixerService = new FixerService();

