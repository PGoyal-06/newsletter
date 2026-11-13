// One flat config for the whole workspace. Rules here enforce the conventions in AGENTS.md.
import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

const WEB = "apps/web/**/*.{js,jsx,mjs,ts,tsx}";
const WEB_SRC = "apps/web/src/**/*.{ts,tsx}";
const DS_UI = "apps/web/src/features/design-system/ui/**";

const DS_MESSAGE =
  "Import design system components from '@/features/design-system/ui' (its index.ts), never a file inside it.";

// Any import string that reaches into design-system/ui past its index, by alias or path.
const DS_DEEP_IMPORT = [
  { regex: "(^|/)design-system/ui/(?!index(\\.tsx?)?$).+", message: DS_MESSAGE },
];
// From a sibling folder in the same feature, e.g. "../ui/IssueRow".
const DS_SIBLING_IMPORT = [{ regex: "^(\\.\\./)+ui/(?!index(\\.tsx?)?$).+", message: DS_MESSAGE }];

const DOMAIN_IMPORTS = [
  {
    group: ["next", "next/*", "react", "react-dom", "@tanstack/*"],
    message: "Domain code is framework free.",
  },
  {
    group: ["**/adapters/**"],
    message: "Domain code must not import adapters; adapters depend on the domain.",
  },
];

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

  // The design system is the one feature others may import from, and only through its
  // index (spec 0003, AC-11). Applies to every web file outside the ui folder itself.
  {
    files: [WEB_SRC],
    ignores: [DS_UI],
    rules: { "no-restricted-imports": ["error", { patterns: DS_DEEP_IMPORT }] },
  },
  {
    // Inside the design-system feature, a sibling folder reaches ui through "../ui".
    files: ["apps/web/src/features/design-system/**/*.{ts,tsx}"],
    ignores: [DS_UI],
    rules: {
      "no-restricted-imports": ["error", { patterns: [...DS_DEEP_IMPORT, ...DS_SIBLING_IMPORT] }],
    },
  },

  // Domain layers stay pure: no frameworks, no Apps Script services, no network.
  {
    files: ["**/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: DOMAIN_IMPORTS }],
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
  {
    // A later block replaces an earlier block's options for the same rule, so web domain
    // files get both lists here.
    files: ["apps/web/src/**/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [...DOMAIN_IMPORTS, ...DS_DEEP_IMPORT] }],
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
