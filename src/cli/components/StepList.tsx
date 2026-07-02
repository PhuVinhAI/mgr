import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { StepView } from "./ink-sink.js";
import { getMessages } from "../../i18n/index.js";

interface Props {
  steps: StepView[];
}

const glyph = (status: StepView["status"]): string => {
  switch (status) {
    case "start":
      return "";
    case "success":
      return "✓";
    case "fail":
      return "✗";
  }
};

const color = (status: StepView["status"]): string => {
  switch (status) {
    case "start":
      return "cyan";
    case "success":
      return "green";
    case "fail":
      return "red";
  }
};

export const StepList: React.FC<Props> = ({ steps }) => {
  const stepMap = getMessages().steps as unknown as Record<string, string | undefined>;
  const label = (id: string): string => stepMap[id] ?? id;
  return (
    <Box flexDirection="column">
      {steps.map((s) => (
        <Box key={s.id}>
          <Box marginRight={1}>
            {s.status === "start" ? (
              <Text color="cyan">
                <Spinner type="dots" />
              </Text>
            ) : (
              <Text color={color(s.status)}>{glyph(s.status)}</Text>
            )}
          </Box>
          <Text>
            <Text color={color(s.status)}>{label(s.id)}</Text>
            {s.message ? <Text dimColor> — {s.message}</Text> : null}
            {s.durationMs !== undefined && s.status !== "start" ? (
              <Text dimColor> ({Math.round(s.durationMs)} ms)</Text>
            ) : null}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
