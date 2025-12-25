// frontend/src/components/AlertDetail.tsx
// Alert detail view with diff viewer and fix button

'use client';

import { useState, useCallback } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { clsx } from 'clsx';
import type { Alert, FixPayload, Severity } from '@/types';

interface AlertDetailProps {
  alert: Alert;
  onApplyFix: (payload: FixPayload) => void;
  onDismiss: () => void;
}

const severityConfig: Record<Severity, { bg: string; text: string; border: string; label: string; glow: string }> = {
  critical: {
    bg: 'bg-agent-critical/10',
    text: 'text-agent-critical',
    border: 'border-agent-critical/30',
    label: 'CRITICAL',
    glow: 'shadow-agent-critical/20',
  },
  high: {
    bg: 'bg-agent-high/10',
    text: 'text-agent-high',
    border: 'border-agent-high/30',
    label: 'HIGH',
    glow: 'shadow-agent-high/20',
  },
  medium: {
    bg: 'bg-agent-medium/10',
    text: 'text-agent-medium',
    border: 'border-agent-medium/30',
    label: 'MEDIUM',
    glow: 'shadow-agent-medium/20',
  },
  low: {
    bg: 'bg-agent-low/10',
    text: 'text-agent-low',
    border: 'border-agent-low/30',
    label: 'LOW',
    glow: 'shadow-agent-low/20',
  },
  info: {
    bg: 'bg-agent-info/10',
    text: 'text-agent-info',
    border: 'border-agent-info/30',
    label: 'INFO',
    glow: 'shadow-agent-info/20',
  },
};

// Custom styles for the diff viewer to match our dark theme
const diffStyles = {
  variables: {
    dark: {
      diffViewerBackground: '#0a0e14',
      diffViewerColor: '#c5c8c6',
      addedBackground: '#1a3d2e',
      addedColor: '#00ff9f',
      removedBackground: '#3d1a24',
      removedColor: '#ff3b5c',
      wordAddedBackground: '#2d5a43',
      wordRemovedBackground: '#5a2d38',
      addedGutterBackground: '#1a3d2e',
      removedGutterBackground: '#3d1a24',
      gutterBackground: '#131920',
      gutterBackgroundDark: '#0a0e14',
      highlightBackground: '#2d3848',
      highlightGutterBackground: '#1a222d',
      codeFoldGutterBackground: '#131920',
      codeFoldBackground: '#1a222d',
      emptyLineBackground: '#131920',
      gutterColor: '#6b7280',
      addedGutterColor: '#00cc7f',
      removedGutterColor: '#ff3b5c',
      codeFoldContentColor: '#6b7280',
      diffViewerTitleBackground: '#131920',
      diffViewerTitleColor: '#c5c8c6',
      diffViewerTitleBorderColor: '#2d3848',
    },
  },
  contentText: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: '13px',
    lineHeight: '1.6',
  },
  gutter: {
    minWidth: '40px',
    padding: '0 8px',
  },
  line: {
    padding: '0 10px',
  },
};

export function AlertDetail({ alert, onApplyFix, onDismiss }: AlertDetailProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [showFullDiff, setShowFullDiff] = useState(false);
  const severity = severityConfig[alert.severity];
  const fileName = alert.filePath.split(/[/\\]/).pop() || alert.filePath;

  const handleApplyFix = useCallback(() => {
    setIsApplying(true);
    
    const payload: FixPayload = {
      alertId: alert.id,
      filePath: alert.filePath,
      originalContent: alert.currentContent,
      replacementContent: alert.proposedFix,
    };

    onApplyFix(payload);
    
    // Reset after a short delay (UI feedback)
    setTimeout(() => {
      setIsApplying(false);
    }, 500);
  }, [alert, onApplyFix]);

  // Extract relevant lines for compact diff view
  const getContextLines = (content: string, targetLine: number, contextSize: number = 5) => {
    const lines = content.split('\n');
    const start = Math.max(0, targetLine - contextSize - 1);
    const end = Math.min(lines.length, targetLine + contextSize);
    return {
      lines: lines.slice(start, end).join('\n'),
      startLine: start + 1,
    };
  };

  const currentContext = getContextLines(alert.currentContent, alert.line);
  const proposedContext = getContextLines(alert.proposedFix, alert.line);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-agent-border bg-agent-surface/30">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Severity and Rule */}
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                'px-3 py-1 rounded text-xs font-bold tracking-wider border shadow-lg',
                severity.bg,
                severity.text,
                severity.border,
                severity.glow
              )}
            >
              {severity.label}
            </span>
            <span className="text-agent-text-muted text-sm font-mono">
              {alert.rule}
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={onDismiss}
            className="p-2 rounded-lg hover:bg-agent-surface-light text-agent-text-muted hover:text-agent-text transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* File Path */}
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-agent-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-mono text-sm text-agent-text">{fileName}</span>
          <span className="text-agent-text-muted text-xs">Line {alert.line}:{alert.column}</span>
        </div>
        <p className="text-xs text-agent-text-muted font-mono truncate">{alert.filePath}</p>

        {/* Message */}
        <div className="mt-4 p-3 rounded-lg bg-agent-bg border border-agent-border">
          <p className="text-sm text-agent-text leading-relaxed">{alert.message}</p>
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Diff Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-agent-surface/50 border-b border-agent-border">
          <div className="flex items-center gap-4">
            <h3 className="font-display text-sm tracking-wider text-agent-text-muted uppercase">
              Proposed Changes
            </h3>
            <button
              onClick={() => setShowFullDiff(!showFullDiff)}
              className="text-xs text-agent-info hover:text-agent-accent transition-colors"
            >
              {showFullDiff ? 'Show Context Only' : 'Show Full File'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-agent-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#3d1a24]" />
              Removed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#1a3d2e]" />
              Added
            </span>
          </div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-auto">
          <ReactDiffViewer
            oldValue={showFullDiff ? alert.currentContent : currentContext.lines}
            newValue={showFullDiff ? alert.proposedFix : proposedContext.lines}
            splitView={true}
            useDarkTheme={true}
            styles={diffStyles}
            compareMethod={DiffMethod.WORDS}
            leftTitle="Current"
            rightTitle="After Fix"
            showDiffOnly={!showFullDiff}
            extraLinesSurroundingDiff={3}
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 border-t border-agent-border bg-agent-surface/50">
        <div className="flex items-center justify-between">
          <p className="text-xs text-agent-text-muted">
            Applying this fix will mask the detected password with asterisks.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onDismiss}
              className="px-4 py-2 rounded-lg text-sm font-medium text-agent-text-muted hover:text-agent-text hover:bg-agent-surface-light transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleApplyFix}
              disabled={isApplying}
              className={clsx(
                'px-6 py-2 rounded-lg text-sm font-bold tracking-wider transition-all',
                'bg-agent-accent text-agent-bg hover:bg-agent-accent-dim',
                'shadow-lg shadow-agent-accent/20 hover:shadow-agent-accent/40',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2'
              )}
            >
              {isApplying ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Fix It</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

