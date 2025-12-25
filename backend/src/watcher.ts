// backend/src/watcher.ts
// File watcher using Chokidar with 500ms debounce to prevent event spam

import chokidar, { FSWatcher } from 'chokidar';
import debounce from 'lodash.debounce';
import path from 'path';
import fs from 'fs/promises';

export interface WatcherConfig {
  watchDir: string;
  debounceMs: number;
  ignored: string[];
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  filePath: string;
  content?: string;
}

export type FileChangeHandler = (event: FileChangeEvent) => void;

const DEFAULT_IGNORED = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/*.log',
  '**/coverage/**',
  '**/.cache/**',
];

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private config: WatcherConfig;
  private handlers: Set<FileChangeHandler> = new Set();
  private debouncedHandlers: Map<string, ReturnType<typeof debounce>> = new Map();

  constructor(config: Partial<WatcherConfig> = {}) {
    this.config = {
      watchDir: config.watchDir || process.env.WATCH_DIR || process.cwd(),
      debounceMs: config.debounceMs || 500,
      ignored: config.ignored || DEFAULT_IGNORED,
    };
  }

  /**
   * Register a handler for file change events
   */
  onFileChange(handler: FileChangeHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Get the current watch directory
   */
  getWatchDir(): string {
    return this.config.watchDir;
  }

  /**
   * Start watching the configured directory
   */
  async start(): Promise<void> {
    if (this.watcher) {
      console.warn('[Watcher] Already running, stopping existing watcher first');
      await this.stop();
    }

    console.log(`[Watcher] Starting to watch: ${this.config.watchDir}`);
    console.log(`[Watcher] Debounce: ${this.config.debounceMs}ms`);

    this.watcher = chokidar.watch(this.config.watchDir, {
      ignored: this.config.ignored,
      persistent: true,
      ignoreInitial: true, // Don't emit events for existing files on startup
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
      .on('error', (error) => this.handleError(error))
      .on('ready', () => {
        console.log('[Watcher] Initial scan complete. Ready for changes.');
      });
  }

  /**
   * Stop the watcher
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      
      // Clear all debounced handlers
      this.debouncedHandlers.forEach((handler) => handler.cancel());
      this.debouncedHandlers.clear();
      
      console.log('[Watcher] Stopped');
    }
  }

  /**
   * Handle file events with debouncing
   */
  private handleFileEvent(type: 'add' | 'change' | 'unlink', filePath: string): void {
    const absolutePath = path.resolve(filePath);
    
    // Get or create debounced handler for this file
    let debouncedHandler = this.debouncedHandlers.get(absolutePath);
    
    if (!debouncedHandler) {
      debouncedHandler = debounce(
        async (eventType: 'add' | 'change' | 'unlink', eventPath: string) => {
          await this.emitFileEvent(eventType, eventPath);
        },
        this.config.debounceMs
      );
      this.debouncedHandlers.set(absolutePath, debouncedHandler);
    }

    debouncedHandler(type, absolutePath);
  }

  /**
   * Emit file event to all registered handlers
   */
  private async emitFileEvent(type: 'add' | 'change' | 'unlink', filePath: string): Promise<void> {
    const event: FileChangeEvent = {
      type,
      filePath,
    };

    // For add/change events, try to read the file content
    if (type !== 'unlink') {
      try {
        event.content = await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        // File might have been deleted between event and read
        if (this.isFileNotFoundError(error)) {
          console.warn(`[Watcher] File no longer exists: ${filePath}`);
          return;
        }
        // Permission denied or other error
        if (this.isPermissionError(error)) {
          console.error(`[Watcher] Permission denied reading file: ${filePath}`);
          return;
        }
        throw error;
      }
    }

    console.log(`[Watcher] File ${type}: ${filePath}`);

    // Notify all handlers
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[Watcher] Error in file change handler:', error);
      }
    }
  }

  /**
   * Handle watcher errors
   */
  private handleError(error: Error): void {
    console.error('[Watcher] Error:', error.message);
  }

  /**
   * Check if error is a file not found error
   */
  private isFileNotFoundError(error: unknown): boolean {
    return (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    );
  }

  /**
   * Check if error is a permission denied error
   */
  private isPermissionError(error: unknown): boolean {
    return (
      error instanceof Error &&
      'code' in error &&
      ((error as NodeJS.ErrnoException).code === 'EACCES' ||
        (error as NodeJS.ErrnoException).code === 'EPERM')
    );
  }
}

