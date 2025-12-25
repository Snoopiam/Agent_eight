// frontend/src/components/AlertFeed.tsx
// Scrollable list of alerts with severity badges

'use client';

import { clsx } from 'clsx';
import type { Alert, Severity } from '@/types';

interface AlertFeedProps {
  alerts: Alert[];
  selectedAlert: Alert | null;
  onSelectAlert: (alert: Alert) => void;
}

const severityConfig: Record<Severity, { bg: string; text: string; border: string; label: string }> = {
  critical: {
    bg: 'bg-agent-critical/10',
    text: 'text-agent-critical',
    border: 'border-agent-critical/30',
    label: 'CRITICAL',
  },
  high: {
    bg: 'bg-agent-high/10',
    text: 'text-agent-high',
    border: 'border-agent-high/30',
    label: 'HIGH',
  },
  medium: {
    bg: 'bg-agent-medium/10',
    text: 'text-agent-medium',
    border: 'border-agent-medium/30',
    label: 'MEDIUM',
  },
  low: {
    bg: 'bg-agent-low/10',
    text: 'text-agent-low',
    border: 'border-agent-low/30',
    label: 'LOW',
  },
  info: {
    bg: 'bg-agent-info/10',
    text: 'text-agent-info',
    border: 'border-agent-info/30',
    label: 'INFO',
  },
};

export function AlertFeed({ alerts, selectedAlert, onSelectAlert }: AlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-agent-surface border border-agent-border flex items-center justify-center">
            <svg className="w-6 h-6 text-agent-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-agent-text-muted text-sm">No alerts</p>
          <p className="text-agent-text-muted/60 text-xs mt-1">Watching for changes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <ul className="divide-y divide-agent-border">
        {alerts.map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            isSelected={selectedAlert?.id === alert.id}
            onClick={() => onSelectAlert(alert)}
          />
        ))}
      </ul>
    </div>
  );
}

interface AlertItemProps {
  alert: Alert;
  isSelected: boolean;
  onClick: () => void;
}

function AlertItem({ alert, isSelected, onClick }: AlertItemProps) {
  const severity = severityConfig[alert.severity];
  const fileName = alert.filePath.split(/[/\\]/).pop() || alert.filePath;
  const dirPath = alert.filePath.split(/[/\\]/).slice(-3, -1).join('/');
  const timeAgo = getTimeAgo(alert.timestamp);

  return (
    <li>
      <button
        onClick={onClick}
        className={clsx(
          'w-full text-left p-4 transition-all duration-150',
          'hover:bg-agent-surface-light',
          'focus:outline-none focus:ring-2 focus:ring-agent-accent/50 focus:ring-inset',
          isSelected && 'bg-agent-surface-light border-l-2 border-l-agent-accent'
        )}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Severity Badge */}
          <span
            className={clsx(
              'px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border',
              severity.bg,
              severity.text,
              severity.border
            )}
          >
            {severity.label}
          </span>

          {/* Timestamp */}
          <span className="text-[10px] text-agent-text-muted whitespace-nowrap">
            {timeAgo}
          </span>
        </div>

        {/* File Name */}
        <div className="font-mono text-sm text-agent-text mb-1 truncate">
          {fileName}
        </div>

        {/* File Path */}
        <div className="text-xs text-agent-text-muted truncate mb-2">
          {dirPath && `.../${dirPath}/`}
        </div>

        {/* Message Preview */}
        <div className="text-xs text-agent-text-muted/80 line-clamp-2">
          {alert.message}
        </div>

        {/* Location */}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-agent-text-muted">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Line {alert.line}:{alert.column}
          </span>
          <span className="text-agent-border">•</span>
          <span>{alert.rule}</span>
        </div>
      </button>
    </li>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

