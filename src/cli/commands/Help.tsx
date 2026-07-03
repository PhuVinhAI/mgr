import React from "react";
import { Box, Text } from "ink";
import { getMessages } from "../../i18n/index.js";

interface Props {
  version: string;
}

export const HelpScreen: React.FC<Props> = ({ version }) => {
  const m = getMessages();
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">
          mgr
        </Text>
        <Text dimColor> v{version}</Text>
      </Box>
      <Text>{m.cli.tagline}</Text>
      <Box marginTop={1} flexDirection="column">
        <Text bold>{m.cli.usage}:</Text>
        <Text> mgr &lt;command&gt; [options]</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>{m.cli.commands}:</Text>
        <Text>
          <Text color="green"> init</Text>{"     "}
          <Text dimColor>{m.cli.cmdInit}</Text>
        </Text>
        <Text>
          <Text color="green"> build</Text>{"    "}
          <Text dimColor>{m.cli.cmdBuild}</Text>
        </Text>
        <Text>
          <Text color="green"> validate</Text>{" "}
          <Text dimColor>{m.cli.cmdValidate}</Text>
        </Text>
        <Text>
          <Text color="green"> doctor</Text>{"   "}
          <Text dimColor>{m.cli.cmdDoctor}</Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>{m.cli.options}:</Text>
        <Text>
          <Text color="yellow"> --lang &lt;en|vi&gt;</Text>{"  "}
          <Text dimColor>{m.cli.optLang}</Text>
        </Text>
        <Text>
          <Text color="yellow"> --template &lt;name&gt;</Text>{"  "}
          <Text dimColor>{m.cli.optTemplate}</Text>
        </Text>
        <Text>
          <Text color="yellow"> --help, -h</Text>{"        "}
          <Text dimColor>{m.cli.optHelp}</Text>
        </Text>
        <Text>
          <Text color="yellow"> --version, -v</Text>{"     "}
          <Text dimColor>{m.cli.optVersion}</Text>
        </Text>
      </Box>
    </Box>
  );
};
