// One flat config for the whole workspace. Rules here enforce the conventions in AGENTS.md.
import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

const WEB = "apps/web/**/*.{js,jsx,mjs,ts,tsx}";

// Apps Script services. Domain code must take facades instead (AGENTS.md, Clean Architecture).
const APPS_SCRIPT_GLOBALS = [
  "GmailApp",
  "DriveApp",
  "ScriptApp",
  "ContentService",
  "PropertiesService",
  "LockService",
  "CacheService",
  "UrlFetchApp",
  "Utilities",
  "Session",
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "apps/web/public/sw.js",
      "apps/web/public/swe-worker-*.js",
      "apps/web/next-env.d.ts",
      "apps/web/test-results/**",
      "apps/web/playwright-report/**",
      ".agents/**",
      ".claude/**",
      ".gstack/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Next.js, React, hooks, and jsx-a11y rules, only for the web app.
  ...nextVitals.map((config) => ({ ...config, files: [WEB] })),
  {
    files: [WEB],
    settings: { next: { rootDir: "apps/web/" } },
  },

  // Node scripts and config files.
  {
    files: ["**/*.mjs", "**/*.config.{ts,mjs}", "apps/script/scripts/**"],
    languageOptions: { globals: globals.node },
  },

  // Leading underscore marks an intentionally unused parameter (e.g. Apps Script event args).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },

  // Named exports only.
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message:
            "Use a named export (AGENTS.md). Default exports are only for files Next requires.",
        },
      ],
    },
  },
  {
    // Files where Next (or a tool config) requires a default export.
    files: [
      "apps/web/src/app/**/{page,layout,template,loading,error,global-error,not-found,default,manifest,icon,apple-icon,opengraph-image,twitter-image,sitemap,robots}.{ts,tsx}",
      "**/*.config.{ts,mjs}",
    ],
    rules: { "no-restricted-syntax": "off" },
  },

  // Env is read in one place only.
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    ignores: ["apps/web/src/env.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Read env through apps/web/src/env.ts (AGENTS.md).",
        },
      ],
    },
  },

  // Domain layers stay pure: no frameworks, no Apps Script services, no network.
  {
    files: ["**/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "react", "react-dom", "@tanstack/*"],
              message: "Domain code is framework free.",
            },
            {
              group: ["**/adapters/**"],
              message: "Domain code must not import adapters; adapters depend on the domain.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...APPS_SCRIPT_GLOBALS.map((name) => ({
          name,
          message: "Take a facade from adapters/ instead.",
        })),
        { name: "fetch", message: "Take an HTTP facade from adapters/ instead." },
      ],
    },
  },

  // Tests may use non null assertions and loose casts on fakes.
  {
    files: ["**/*.test.{ts,tsx}", "**/e2e/**/*.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },

  // Turn off rules that fight Prettier. Keep last.
  prettier,
);
