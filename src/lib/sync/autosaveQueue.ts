/**
 * Debounced autosave queue for Drive uploads.
 *
 * Holds at most one pending job (the latest one wins) and runs uploads
 * sequentially. `flush()` sends the pending job immediately and waits for any
 * in-flight upload, so callers (e.g. logout) never drop a write that has not
 * reached Drive yet.
 */

/** `flushed` tells whether flush() actually had a pending or in-flight upload to wait for. */
export type FlushResult = { ok: true; flushed: boolean } | { ok: false; error: unknown };

export interface AutosaveQueueOptions<J> {
  delayMs: number;
  run: (job: J) => Promise<void>;
  onError?: (error: unknown) => void;
}

export interface AutosaveQueue<J> {
  schedule: (job: J) => void;
  flush: () => Promise<FlushResult>;
  cancel: () => void;
  hasPending: () => boolean;
}

export function createAutosaveQueue<J>({ delayMs, run, onError }: AutosaveQueueOptions<J>): AutosaveQueue<J> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { job: J } | null = null;
  let inFlight: Promise<FlushResult> | null = null;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const execute = (job: J): Promise<FlushResult> => {
    const previous = inFlight;
    const current: Promise<FlushResult> = (async () => {
      // Keep uploads ordered: a newer full-file write must not race an older one.
      if (previous) await previous;
      try {
        await run(job);
        return { ok: true, flushed: true } as const;
      } catch (error) {
        onError?.(error);
        return { ok: false, error } as const;
      }
    })();
    inFlight = current;
    void current.then(() => {
      if (inFlight === current) inFlight = null;
    });
    return current;
  };

  const takePending = (): J | undefined => {
    clearTimer();
    const job = pending?.job;
    pending = null;
    return job;
  };

  return {
    schedule(job) {
      clearTimer();
      pending = { job };
      timer = setTimeout(() => {
        if (pending) void execute(takePending() as J);
      }, delayMs);
    },
    async flush() {
      if (pending) {
        return execute(takePending() as J);
      }
      if (inFlight) return inFlight;
      return { ok: true, flushed: false };
    },
    cancel() {
      takePending();
    },
    hasPending() {
      return pending !== null || inFlight !== null;
    },
  };
}
