// frontend/src/hooks/useSocket.ts
// Custom hook for managing Socket.io connection lifecycle

import { useEffect, useState, useCallback, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import type { Alert, ScanResult, FixPayload, FixResponse } from '@/types';

interface UseSocketReturn {
  isConnected: boolean;
  watchDir: string | null;
  alerts: Alert[];
  applyFix: (payload: FixPayload) => void;
  clearAlerts: () => void;
  removeAlert: (alertId: string) => void;
}

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [watchDir, setWatchDir] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    // Connection handlers
    function onConnect() {
      console.log('[Cockpit] Connected to Engine');
      setIsConnected(true);
    }

    function onDisconnect() {
      console.log('[Cockpit] Disconnected from Engine');
      setIsConnected(false);
    }

    function onConnectionEstablished(data: { watchDir: string }) {
      console.log('[Cockpit] Watch directory:', data.watchDir);
      setWatchDir(data.watchDir);
    }

    function onScanResult(result: ScanResult) {
      console.log('[Cockpit] Scan result received:', result.alerts.length, 'alerts');
      setAlerts((prev) => {
        // Remove existing alerts for the same file, then add new ones
        const filtered = prev.filter((a) => a.filePath !== result.filePath);
        return [...result.alerts, ...filtered];
      });
    }

    function onFixComplete(response: FixResponse) {
      console.log('[Cockpit] Fix completed:', response);
      if (response.success) {
        // Remove the fixed alert from the list
        setAlerts((prev) => prev.filter((a) => a.id !== response.alertId));
      }
    }

    function onFixError(response: FixResponse) {
      console.error('[Cockpit] Fix error:', response.error);
      // Could show a toast notification here
    }

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connection:established', onConnectionEstablished);
    socket.on('scan:result', onScanResult);
    socket.on('fix:complete', onFixComplete);
    socket.on('fix:error', onFixError);

    // Connect to the socket
    connectSocket();

    // Cleanup on unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connection:established', onConnectionEstablished);
      socket.off('scan:result', onScanResult);
      socket.off('fix:complete', onFixComplete);
      socket.off('fix:error', onFixError);
      disconnectSocket();
    };
  }, []);

  const applyFix = useCallback((payload: FixPayload) => {
    const socket = socketRef.current;
    if (socket.connected) {
      console.log('[Cockpit] Applying fix:', payload.alertId);
      socket.emit('fix:apply', payload);
    } else {
      console.error('[Cockpit] Cannot apply fix: not connected');
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  return {
    isConnected,
    watchDir,
    alerts,
    applyFix,
    clearAlerts,
    removeAlert,
  };
}

