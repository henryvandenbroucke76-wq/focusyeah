import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Request bodies and provider responses are untyped JSON that is
      // validated at runtime, so `any` is used deliberately at those edges.
      "@typescript-eslint/no-explicit-any": "off",
      // Saved browser settings (theme, language, motion) can only be read
      // after hydration, which requires setting state inside an effect.
      "react-hooks/set-state-in-effect": "warn",
      // /signin-with-chatgpt and /signout-with-chatgpt are hosting routes,
      // not Next.js pages, so they need a full page navigation.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
