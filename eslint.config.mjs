import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import nodePlugin from "eslint-plugin-n";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist", "node_modules"],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["src/**/*.ts"],

    languageOptions: {
      globals: globals.node,
    },

    plugins: {
      n: nodePlugin,
    },

    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-explicit-any": "warn",

      // "@typescript-eslint/consistent-type-imports": "error",

      "n/no-process-exit": "error",

      "no-console": "off",
    },
  },

  eslintConfigPrettier,
];