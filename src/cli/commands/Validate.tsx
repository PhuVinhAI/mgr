import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { check } from "../../pipeline.js";
import type { ValidateResult } from "../../validator/index.js";
import { getMessages, t } from "../../i18n/index.js";
import { useSteps } from "../components/ink-sink.js";
import { StepList } from "../components/StepList.js";
import { ErrorReport } from "../components/ErrorReport.js";
import { MgrErrorList } from "../../errors/index.js";

interface Props {
  root: string;
}

export const ValidateCommand: React.FC<Props> = ({ root }) => {
  const { steps, sink } = useSteps();
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [fatalError, setFatalError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const { exit } = useApp();
  const m = getMessages();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { validation } = await check({ root, sink });
        if (!cancelled) setResult(validation);
      } catch (err) {
        if (!cancelled) setFatalError(err);
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
    const failed = fatalError || (result && !result.ok);
    process.exitCode = failed ? 1 : 0;
    const id = setTimeout(() => exit(), 30);
    return () => clearTimeout(id);
  }, [done]);

  const errorsToShow = fatalError
    ? fatalError
    : result && !result.ok
      ? new MgrErrorList(result.errors)
      : null;

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {m.validate.starting}
      </Text>
      <Box marginTop={1}>
        <StepList steps={steps} />
      </Box>
      {errorsToShow ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">
            {m.validate.failed}
          </Text>
          {result && !result.ok ? (
            <Text>
              {t((m) => m.validate.errorsFound, {
                count: result.errors.length,
              })}
            </Text>
          ) : null}
          <ErrorReport error={errorsToShow} />
        </Box>
      ) : result && result.ok ? (
        <Box marginTop={1}>
          <Text bold color="green">
            {m.validate.ok}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};
