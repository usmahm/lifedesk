import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * Dates go through @lifedesk/core/time.
 * See .claude/rules/dates-and-timezones.md.
 *
 * Exported because flat config *replaces* a rule rather than merging it — any
 * config that also sets `no-restricted-syntax` must spread these back in or it
 * silently switches the ban off. See `next.js`.
 */
export const DATE_RESTRICTIONS = [
  {
    selector: "NewExpression[callee.name='Date']",
    message:
      "Use @lifedesk/core/time instead of `new Date()`. Dates must be timezone-aware and injectable. See .claude/rules/dates-and-timezones.md.",
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message:
      "Use @lifedesk/core/time instead of `Date.now()`. See .claude/rules/dates-and-timezones.md.",
  },
];

/**
 * Shared base config. See .claude/rules/file-organization.md for the
 * conventions these rules exist to enforce.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: { turbo: turboPlugin },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    rules: {
      // No `any`. See CLAUDE.md hard rule 3.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      "no-restricted-syntax": ["error", ...DATE_RESTRICTIONS],

      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/generated/**",
      "**/coverage/**",
    ],
  },
];
