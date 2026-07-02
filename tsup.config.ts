import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "cli/index": "src/cli/index.tsx",
  },
  format: ["esm"],
  target: "node18",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: false,
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
