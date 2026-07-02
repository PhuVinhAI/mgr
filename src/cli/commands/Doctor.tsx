import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { stat } from "node:fs/promises";
import * as path from "node:path";
import { getMessages, t } from "../../i18n/index.js";
import { check } from "../../pipeline.js";
import { MgrError, MgrErrorList } from "../../errors/index.js";
import { ErrorReport } from "../components/ErrorReport.js";

interface Props {
  root: string;
}

interface DoctorState {
  hasProject: boolean;
  projectCheck?: "ok" | "error";
  projectError?: unknown;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

export const DoctorCommand: React.FC<Props> = ({ root }) => {
  const m = getMessages();
  const [state, setState] = useState<DoctorState>({ hasProject: false });
  const [done, setDone] = useState(false);
  const { exit } = useApp();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const configPath = path.join(root, "mgr.config.json");
      const hasProject = await fileExists(configPath);
      const next: DoctorState = { hasProject };
      if (hasProject) {
        try {
          const { validation } = await check({ root });
          next.projectCheck = validation.ok ? "ok" : "error";
          if (!validation.ok) next.projectError = new MgrErrorList(validation.errors);
        } catch (err) {
          next.projectCheck = "error";
          next.projectError = err;
        }
      }
      if (!cancelled) setState(next);
      if (!cancelled) setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [root]);

  useEffect(() => {
    if (!done) return;
    const failed =
      state.projectCheck === "error" ||
      (state.hasProject && state.projectCheck !== "ok");
    process.exitCode = failed ? 1 : 0;
    const id = setTimeout(() => exit(), 30);
    return () => clearTimeout(id);
  }, [done]);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {m.doctor.starting}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>{t((m) => m.doctor.node, { version: process.version })}</Text>
        <Text>
          {t((m) => m.doctor.platform, {
            name: `${process.platform} ${process.arch}`,
          })}
        </Text>
        <Text>{t((m) => m.doctor.cwd, { path: root })}</Text>
        {state.hasProject ? (
          <Text color="green">{m.doctor.projectFound}</Text>
        ) : (
          <Text color="yellow">{m.doctor.projectMissing}</Text>
        )}
      </Box>
      {state.projectError ? (
        <Box marginTop={1} flexDirection="column">
          <Text color="red" bold>
            {m.validate.failed}
          </Text>
          <ErrorReport error={state.projectError} />
        </Box>
      ) : done && state.hasProject && state.projectCheck === "ok" ? (
        <Box marginTop={1}>
          <Text bold color="green">
            {m.doctor.ok}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};
