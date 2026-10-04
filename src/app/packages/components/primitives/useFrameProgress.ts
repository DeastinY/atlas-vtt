import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ProgressCount } from './useLingeringTask';

export interface FrameProgressApi {
  progress: ProgressCount | null;
  /** Records a step; safe to call thousands of times a second. */
  report: (done: number, total: number) => void;
  clear: () => void;
}

/**
 * Progress that may be reported far more often than the screen refreshes,
 * published at most once a frame. Only components that read it
 * (`useFrameProgressValue`) render again, so a dialog holding thousands of
 * previews can show a save's progress without rendering them all every frame.
 */
export class FrameProgress {
  private latest: ProgressCount | null = null;
  private published: ProgressCount | null = null;
  private frame: number | null = null;
  private readonly listeners = new Set<() => void>();

  /** Records a step; safe to call thousands of times a second. */
  readonly report = (done: number, total: number): void => {
    this.latest = { done, total };
    this.frame ??= window.requestAnimationFrame(() => {
      this.frame = null;
      this.publish(this.latest);
    });
  };

  readonly clear = (): void => {
    this.cancel();
    this.latest = null;
    this.publish(null);
  };

  /** Drops a report still waiting for its frame, e.g. on unmount. */
  readonly cancel = (): void => {
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
  };

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  readonly current = (): ProgressCount | null => this.published;

  private publish(progress: ProgressCount | null): void {
    if (progress === this.published) return;
    this.published = progress;
    this.listeners.forEach(listener => listener());
  }
}

const noSubscription = (): (() => void) => () => undefined;
const noProgress = (): null => null;

/** What `source` last published; the caller renders at most once a frame. */
export function useFrameProgressValue(source: FrameProgress | null): ProgressCount | null {
  return useSyncExternalStore(source?.subscribe ?? noSubscription, source?.current ?? noProgress);
}

/** Progress that may be reported far more often than the screen refreshes, rendered at most once a frame. */
export function useFrameProgress(): FrameProgressApi {
  const [source] = useState(() => new FrameProgress());
  useEffect(() => source.cancel, [source]);
  const progress = useFrameProgressValue(source);
  const clear = useCallback((): void => source.clear(), [source]);
  return { progress, report: source.report, clear };
}
