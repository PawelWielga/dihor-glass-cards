import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import * as pluginTerser from "@rollup/plugin-terser";
import { string } from "rollup-plugin-string";
import path from "path";

const terserPlugin =
  pluginTerser.terser || pluginTerser.default || pluginTerser;

export default {
  input: "src/index.ts",
  output: {
    file: "dist/dihor-glass-cards.js",
    format: "es",
    sourcemap: false,
  },
  plugins: [
    resolve(),
    string({
      include: ["**/*.html", "**/*.css"].map((p) => path.posix.normalize(p)),
    }),
    typescript({
      tsconfig: "./tsconfig.json",
    }),
    terserPlugin(),
  ],
};
