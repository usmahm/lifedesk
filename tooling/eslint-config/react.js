import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

import { baseConfig } from "./base.js";

/**
 * React library config — for packages/ui and anything else shipping components.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const reactConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker },
    },
  },
  // `configs.recommended` is still the legacy shape (plugins as an array).
  // The flat-config entry point is under `configs.flat`.
  reactHooks.configs.flat.recommended,
];
