/**
 * Structural logger emitting typed events.
 * The CLI (Ink) renders these; library consumers can plug their own sink.
 * The compiler pipeline emits events; it does not decide colors or formatting.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  level: LogLevel;
  step?: string;
  message: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export interface StepEvent {
  step: string;
  status: "start" | "success" | "fail";
  durationMs?: number;
  message?: string;
}

export type SinkEvent =
  | { kind: "log"; event: LogEvent }
  | { kind: "step"; event: StepEvent };

export interface LoggerSink {
  emit(event: SinkEvent): void;
}

/** Silent sink: discards all events. Default for library use. */
export const nullSink: LoggerSink = {
  emit() {
    /* noop */
  },
};

export class Logger {
  private sink: LoggerSink;
  private stepStarts: Map<string, number> = new Map();

  constructor(sink: LoggerSink = nullSink) {
    this.sink = sink;
  }

  setSink(sink: LoggerSink): void {
    this.sink = sink;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }
  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }
  error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }

  stepStart(step: string, message?: string): void {
    this.stepStarts.set(step, performanceNow());
    const event: StepEvent = { step, status: "start" };
    if (message !== undefined) event.message = message;
    this.sink.emit({ kind: "step", event });
  }

  stepSuccess(step: string, message?: string): void {
    const start = this.stepStarts.get(step);
    const durationMs = start !== undefined ? performanceNow() - start : 0;
    this.stepStarts.delete(step);
    const event: StepEvent = { step, status: "success", durationMs };
    if (message !== undefined) event.message = message;
    this.sink.emit({ kind: "step", event });
  }

  stepFail(step: string, message?: string): void {
    const start = this.stepStarts.get(step);
    const durationMs = start !== undefined ? performanceNow() - start : 0;
    this.stepStarts.delete(step);
    const event: StepEvent = { step, status: "fail", durationMs };
    if (message !== undefined) event.message = message;
    this.sink.emit({ kind: "step", event });
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    const event: LogEvent = { level, message, timestamp: Date.now() };
    if (meta !== undefined) event.meta = meta;
    this.sink.emit({ kind: "log", event });
  }
}

function performanceNow(): number {
  // Node has global performance since v16
  return performance.now();
}

/** Collect events into an array — useful for tests and Ink rendering. */
export class MemorySink implements LoggerSink {
  readonly events: SinkEvent[] = [];
  emit(event: SinkEvent): void {
    this.events.push(event);
  }
}
