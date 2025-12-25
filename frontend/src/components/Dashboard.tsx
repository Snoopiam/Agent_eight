// frontend/src/components/Dashboard.tsx
// Main dashboard layout - The Cockpit

'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { AlertFeed } from './AlertFeed';
import { AlertDetail } from './AlertDetail';
import type { Alert } from '@/types';

export function Dashboard() {
  const { isConnected, watchDir, alerts, applyFix, clearAlerts } = useSocket();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-agent-border bg-agent-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-agent-accent to-agent-info flex items-center justify-center">
                <span className="font-display font-bold text-agent-bg text-lg">8</span>
              </div>
              <div>
                <h1 className="font-display font-bold text-xl tracking-wider text-agent-text">
                  AGENT EIGHT
                </h1>
                <p className="text-xs text-agent-text-muted tracking-wide">THE COCKPIT</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-6">
              {/* Watch Directory */}
              {watchDir && (
                <div className="hidden md:flex items-center gap-2 text-sm text-agent-text-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="max-w-[300px] truncate font-mono text-xs">{watchDir}</span>
                </div>
              )}

              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? 'bg-agent-accent animate-pulse'
                      : 'bg-agent-critical'
                  }`}
                />
                <span className="text-sm text-agent-text-muted">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Alert Count Badge */}
              {alerts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-agent-critical/20 text-agent-critical text-sm font-medium border border-agent-critical/30">
                    {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={clearAlerts}
                    className="text-agent-text-muted hover:text-agent-text text-sm transition-colors"
                    title="Clear all alerts"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Alert Feed - Left Panel */}
        <aside className="w-96 border-r border-agent-border bg-agent-surface/30 flex flex-col">
          <div className="p-4 border-b border-agent-border">
            <h2 className="font-display text-sm tracking-wider text-agent-text-muted uppercase">
              Alert Feed
            </h2>
          </div>
          <AlertFeed
            alerts={alerts}
            selectedAlert={selectedAlert}
            onSelectAlert={setSelectedAlert}
          />
        </aside>

        {/* Alert Detail - Right Panel */}
        <section className="flex-1 flex flex-col bg-agent-bg">
          {selectedAlert ? (
            <AlertDetail
              alert={selectedAlert}
              onApplyFix={applyFix}
              onDismiss={() => setSelectedAlert(null)}
            />
          ) : (
            <EmptyState isConnected={isConnected} alertCount={alerts.length} />
          )}
        </section>
      </main>
    </div>
  );
}

function EmptyState({ isConnected, alertCount }: { isConnected: boolean; alertCount: number }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-agent-surface border border-agent-border flex items-center justify-center">
          {alertCount === 0 ? (
            <svg className="w-10 h-10 text-agent-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-agent-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          )}
        </div>
        
        <h3 className="font-display text-lg text-agent-text mb-2">
          {alertCount === 0 ? 'All Clear' : 'Select an Alert'}
        </h3>
        
        <p className="text-agent-text-muted text-sm leading-relaxed">
          {!isConnected
            ? 'Connecting to The Engine...'
            : alertCount === 0
            ? 'No security issues detected. Save a file to trigger a scan.'
            : 'Click on an alert from the feed to view details and apply fixes.'}
        </p>

        {!isConnected && (
          <div className="mt-6 flex items-center justify-center gap-2 text-agent-critical text-sm">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Attempting to connect...</span>
          </div>
        )}
      </div>
    </div>
  );
}

