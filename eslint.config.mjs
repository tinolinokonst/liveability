import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // ESLint 9 only ignores node_modules and .git by default, so without this
    // the run spends itself on build output and worktree copies: on the first
    // clean run, 111 of the 115 files with problems were under .next/ or
    // .claude/worktrees/, drowning the four real ones.
    ignores: [".next/**", ".claude/**", "next-env.d.ts"],
  },
  // core-web-vitals alone leaves the @typescript-eslint rules undefined, which
  // turns every eslint-disable comment naming one into a "rule not found" error.
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
