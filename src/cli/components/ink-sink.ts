/**
 * Ink logger sink: bridges the compiler pipeline into a React state store.
 */
import { useEffect, useState } from "react";
import type { LoggerSink, SinkEvent, StepEvent } from "../../logger/index.js";

export interface StepView {
  id: string;
  label?: string;
  status: "start" | "success" | "fail";
  durationMs?: number;
  message?: string;
}

export function createInkSink(onEvent: (event: SinkEvent) => void): LoggerSink {
  return {
    emit(event) {
      onEvent(event);
    },
  };
}

/**
 * Hook: consume events and expose the ordered list of steps observed.
 */
export function useSteps(): {
  steps: StepView[];
  sink: LoggerSink;
} {
  const [steps, setSteps] = useState<StepView[]>([]);
  const sink: LoggerSink = {
    emit(event: SinkEvent) {
      if (event.kind !== "step") return;
      const e: StepEvent = event.event;
      setSteps((prev) => {
        const next = [...prev];
        const idx = next.findIndex((s) => s.id === e.step);
        const view: StepView = {
          id: e.step,
          status: e.status,
          ...(e.durationMs !== undefined ? { durationMs: e.durationMs } : {}),
          ...(e.message !== undefined ? { message: e.message } : {}),
        };
        if (idx >= 0) next[idx] = { ...next[idx], ...view };
        else next.push(view);
        return next;
      });
    },
  };
  return { steps, sink };
}

export function useMounted(): boolean {
  const [m, set] = useState(false);
  useEffect(() => {
    set(true);
  }, []);
  return m;
}
