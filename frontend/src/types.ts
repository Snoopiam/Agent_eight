// frontend/src/types.ts
// Type definitions for Agent Eight frontend

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Alert {
  id: string;
  filePath: string;
  severity: Severity;
  rule: string;
  message: string;
  line: number;
  column: number;
  currentContent: string;
  proposedFix: string;
  matchedText: string;
  timestamp: number;
}

export interface ScanResult {
  alerts: Alert[];
  filePath: string;
  scannedAt: number;
}

export interface FixPayload {
  alertId: string;
  filePath: string;
  originalContent: string;
  replacementContent: string;
}

export interface FixResponse {
  success: boolean;
  filePath: string;
  alertId: string;
  error?: string;
}

// Socket.io event types for type-safe communication
export interface ServerToClientEvents {
  'scan:result': (result: ScanResult) => void;
  'fix:complete': (response: FixResponse) => void;
  'fix:error': (response: FixResponse) => void;
  'connection:established': (data: { watchDir: string }) => void;
}

export interface ClientToServerEvents {
  'fix:apply': (payload: FixPayload) => void;
}

