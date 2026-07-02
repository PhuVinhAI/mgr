import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { compile, type CompileResult } from "../../pipeline.js";
import { getMessages, t } from "../../i18n/index.js";
import { useSteps } from "../components/ink-sink.js";
import { StepList } from "../components/StepList.js";
import { ErrorReport } from "../components/ErrorReport.js";

interface Props {
  root: string;
}

export const BuildCommand: React.FC<Props> = ({ root }) => {
  const { steps, sink } = useSteps();
  const [result, setResult] = useState<CompileResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const { exit } = useApp();
  const m = getMessages();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await compile({ root, sink });
        if (!cancelled) setResult(r);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [root]);

  useEffect(() => {
    if (!done) return;
    const code = error ? 1 : 0;
    // Give Ink one tick to flush the final frame.
    const id = setTimeout(() => exit(), 30);
    if (code !== 0) process.exitCode = code;
    return () => clearTimeout(id);
  }, [done]);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {m.build.starting}
      </Text>
      <Box marginTop={1}>
        <StepList steps={steps} />
      </Box>
      {error ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">
            {m.build.failed}
          </Text>
          <ErrorReport error={error} />
        </Box>
      ) : null}
      {result ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="green">
            {m.build.success}
          </Text>
          <Text>{t((m) => m.build.output, { path: result.outputPath })}</Text>
          <Text>
            {t((m) => m.build.files, { count: result.graph.documents.size })}
          </Text>
          <Text>
            {t((m) => m.build.duration, {
              ms: Math.round(result.durationMs),
            })}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};
