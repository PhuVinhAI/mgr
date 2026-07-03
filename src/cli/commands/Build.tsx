import React, { useEffect, useState } from "react";
import { writeFile } from "node:fs/promises";
import * as path from "node:path";
import { Box, Text, useApp } from "ink";
import { compile, type CompileResult } from "../../pipeline.js";
import { getMessages, t } from "../../i18n/index.js";
import { useSteps } from "../components/ink-sink.js";
import { StepList } from "../components/StepList.js";
import { ErrorReport } from "../components/ErrorReport.js";

interface Props {
  root: string;
}

/** Format a token count with kind marker for the CLI summary line. */
function fmt(count: { tokens: number; kind: string; model: string }): string {
  const tag =
    count.kind === "exact"
      ? ""
      : count.kind === "estimate"
        ? " (est)"
        : " (err)";
  return `${count.tokens}${tag}`;
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
        // Write a `.tokens.json` sidecar next to the prompt spec so
        // downstream tools (CI diffs, dashboards, prompt-engineering
        // notebooks) can read the count without re-running the
        // tokenizer.
        if (r.tokens) {
          const sidecarPath = `${r.outputPath}.tokens.json`;
          await writeFile(
            sidecarPath,
            JSON.stringify(
              {
                project: r.config.name,
                version: r.config.version,
                outputPath: r.outputPath,
                generatedAt: new Date().toISOString(),
                characters: r.tokens.characters,
                providers: {
                  openai: r.tokens.openai,
                  anthropic: r.tokens.anthropic,
                  gemini: r.tokens.gemini,
                },
              },
              null,
              2,
            ),
            "utf8",
          );
        }
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
          {result.tokens ? (
            <>
              <Box marginTop={1} flexDirection="column">
                <Text bold>Token counts</Text>
                <Text>
                  {"  "}characters: {result.tokens.characters}
                </Text>
                <Text>
                  {"  "}openai ({result.tokens.openai.model}):{" "}
                  {fmt(result.tokens.openai)}
                </Text>
                <Text>
                  {"  "}anthropic ({result.tokens.anthropic.model}):{" "}
                  {fmt(result.tokens.anthropic)}
                </Text>
                <Text>
                  {"  "}gemini ({result.tokens.gemini.model}):{" "}
                  {fmt(result.tokens.gemini)}
                </Text>
                {result.tokens.gemini.kind === "estimate" ? (
                  <Text dimColor>
                    {"  "}gemini: estimate (set GEMINI_API_KEY for exact)
                  </Text>
                ) : null}
                <Text dimColor>
                  {"  "}sidecar: {result.outputPath}.tokens.json
                </Text>
              </Box>
            </>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
};

// Re-export for tests that may want to format a count without React.
export const __testing = { fmt };
// Avoid an unused import warning when path is only referenced via the
// path.basename call below; keeps the module stable for callers that
// import BuildCommand.
void path;
