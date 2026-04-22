import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import obsidian from "eslint-plugin-obsidianmd";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      obsidian: obsidian.default ?? obsidian,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...(obsidian.default ?? obsidian).configs.recommended.rules,
    },
  },
  {
    ignores: ["main.js", "node_modules/", "eslint.config.mjs"],
  },
];
