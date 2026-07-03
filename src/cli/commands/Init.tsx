import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { mkdir, writeFile, stat, readFile } from "node:fs/promises";
import * as path from "node:path";
import { getMessages, t } from "../../i18n/index.js";

interface Props {
  root: string;
  templateDir: string;
  template: string;
}

interface WriteReport {
  path: string;
  status: "created" | "skipped";
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * List files under the template directory recursively.
 * Deterministic (sorted) so output order matches on every OS.
 */
async function listTemplateFiles(dir: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const out: string[] = [];
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listTemplateFiles(abs);
      out.push(...nested);
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

export const InitCommand: React.FC<Props> = ({ root, templateDir, template }) => {
  const m = getMessages();
  const [reports, setReports] = useState<WriteReport[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const { exit } = useApp();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const files = await listTemplateFiles(templateDir);
        const results: WriteReport[] = [];
        for (const src of files) {
          const rel = path.relative(templateDir, src);
          const dest = path.join(root, rel);
          if (await fileExists(dest)) {
            results.push({ path: rel, status: "skipped" });
            continue;
          }
          await mkdir(path.dirname(dest), { recursive: true });
          const buf = await readFile(src);
          await writeFile(dest, buf);
          results.push({ path: rel, status: "created" });
        }
        if (!cancelled) setReports(results);
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
    process.exitCode = error ? 1 : 0;
    const id = setTimeout(() => exit(), 30);
    return () => clearTimeout(id);
  }, [done]);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {t((m) => m.init.creating, { dir: root })}
      </Text>
      <Text dimColor>
        template: {template}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {reports.map((r) => (
          <Text key={r.path}>
            <Text color={r.status === "created" ? "green" : "yellow"}>
              {r.status === "created" ? "+" : "·"}
            </Text>{" "}
            {r.path}
            <Text dimColor>
              {" "}
              (
              {r.status === "created" ? m.init.created : m.init.skipped}
              )
            </Text>
          </Text>
        ))}
      </Box>
      {error ? (
        <Box marginTop={1}>
          <Text color="red">{String((error as Error).message ?? error)}</Text>
        </Box>
      ) : done ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="green">
            {m.init.done}
          </Text>
          <Text>{m.init.nextSteps}</Text>
          <Text>{m.init.nextBuild}</Text>
          <Text>{m.init.nextValidate}</Text>
        </Box>
      ) : null}
    </Box>
  );
};
