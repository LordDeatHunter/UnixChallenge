import js from "@eslint/js";
import tseslint from "typescript-eslint";
import solid from "eslint-plugin-solid";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: ["*.config.js", "tsconfig.json"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: { solid },
    ...solid.configs["flat/recommended"],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
  },
];
