import React from "react";
import { Box, Text } from "ink";
import { MgrError, MgrErrorList } from "../../errors/index.js";
import { t, getMessages } from "../../i18n/index.js";

interface Props {
  error: unknown;
}

export const ErrorReport: React.FC<Props> = ({ error }) => {
  const m = getMessages();
  const errors: MgrError[] =
    error instanceof MgrErrorList
      ? error.errors
      : error instanceof MgrError
        ? [error]
        : [];

  if (errors.length === 0) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
        <Text color="red" bold>
          {m.errors.unexpected}
        </Text>
        <Text>{message}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {errors.map((e, i) => (
        <Box
          key={i}
          flexDirection="column"
          borderStyle="round"
          borderColor="red"
          paddingX={1}
          marginBottom={1}
        >
          <Text color="red" bold>
            {m.errors.header}: {e.localizedMessage()}
          </Text>
          {e.location ? (
            <Box marginTop={1} flexDirection="column">
              <Text>
                <Text color="yellow">{m.errors.file}:</Text> {e.location.file}
              </Text>
              {e.location.line !== undefined ? (
                <Text>
                  <Text color="yellow">{m.errors.line}:</Text> {e.location.line}
                </Text>
              ) : null}
            </Box>
          ) : null}
          {e.directive ? (
            <Text>
              <Text color="yellow">{m.errors.directive}:</Text> {e.directive}
            </Text>
          ) : null}
          {e.localizedSuggestion() ? (
            <Box marginTop={1}>
              <Text>
                <Text color="green">{m.errors.suggestion}:</Text>{" "}
                {e.localizedSuggestion()}
              </Text>
            </Box>
          ) : null}
        </Box>
      ))}
    </Box>
  );
};
