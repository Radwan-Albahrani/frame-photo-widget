import { spawnSync } from "node:child_process";
import { type ParserPlugin, parse } from "@babel/parser";

export interface CommentHit {
  startLine: number;
  endLine: number;
  start: number;
  end: number;
  text: string;
}

const CHECKED_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const GENERATED_FILE = /\.gen\.(ts|tsx|js|jsx)$/;

const ALLOWED_DIRECTIVE_PREFIXES = [
  "biome-ignore",
  "@ts-expect-error",
  "@ts-ignore",
  "@ts-nocheck",
  "@ts-check",
  "@jsx",
  "@jsxRuntime",
  "@jsxImportSource",
  "prettier-ignore",
  "eslint-disable",
  "eslint-enable",
  "oxlint-disable",
  "react-doctor-disable",
  "legend-doctor-ignore-next-line",
  "@type",
  "<reference",
  "#__PURE__",
  "@__PURE__",
  "v8 ignore",
  "c8 ignore",
  "istanbul ignore",
  "@vitest-environment",
  "EXPECT_PASS",
  "EXPECT_FAIL",
];

function parserPluginsFor(filePath: string): ParserPlugin[] {
  if (filePath.endsWith(".ts")) return ["typescript", "decorators-legacy"];
  if (filePath.endsWith(".tsx")) return ["typescript", "decorators-legacy", "jsx"];
  return ["jsx"];
}

export function findComments(source: string, filePath: string): CommentHit[] {
  const ast = parse(source, {
    sourceType: filePath.endsWith(".cjs") ? "script" : "module",
    allowReturnOutsideFunction: true,
    errorRecovery: true,
    plugins: parserPluginsFor(filePath),
  });
  return (ast.comments ?? []).map((comment) => ({
    startLine: comment.loc?.start.line ?? 1,
    endLine: comment.loc?.end.line ?? 1,
    start: comment.start ?? 0,
    end: comment.end ?? 0,
    text: comment.type === "CommentLine" ? `//${comment.value}` : `/*${comment.value}*/`,
  }));
}

const WHAT_ESCAPE_HATCH = /^what:\s*(?<justification>[\s\S]+)$/i;
const MIN_JUSTIFICATION_LENGTH = 10;
export const SIMPLICITY_REMINDER =
  "Make your code simpler so it works without comments unless one is truly necessary.";

function commentBody(commentText: string): string {
  return commentText
    .replace(/^\/\*+/, "")
    .replace(/\*+\/$/, "")
    .replace(/^\/\//, "")
    .replace(/^[/*\s]+/, "")
    .trim();
}

export function isAllowedDirective(commentText: string): boolean {
  const body = commentBody(commentText);
  return ALLOWED_DIRECTIVE_PREFIXES.some((prefix) => body.startsWith(prefix));
}

export function isJustifiedComment(commentText: string): boolean {
  if (!commentText.startsWith("//") || commentText.includes("\n") || commentText.includes("\r"))
    return false;
  const justification = commentBody(commentText).match(WHAT_ESCAPE_HATCH)?.groups?.justification;
  return justification !== undefined && justification.trim().length >= MIN_JUSTIFICATION_LENGTH;
}

export function resolveExempt(comments: CommentHit[], source: string): boolean[] {
  const justified = comments.map((hit) => isJustifiedComment(hit.text));

  return comments.map((hit, index) => {
    if (isAllowedDirective(hit.text)) return true;
    if (!justified[index]) return false;

    for (const neighborIndex of [index - 1, index + 1]) {
      const neighbor = comments[neighborIndex];
      if (!neighbor || !justified[neighborIndex]) continue;
      const [first, second] = neighbor.start < hit.start ? [neighbor, hit] : [hit, neighbor];
      if (source.slice(first.end, second.start).trim() === "") return false;
    }

    return true;
  });
}

export function parseAddedLines(diff: string): Map<string, Set<number>> {
  const addedLines = new Map<string, Set<number>>();
  let currentFile: string | null = null;
  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice("+++ b/".length);
      continue;
    }
    if (rawLine.startsWith("+++ ")) {
      currentFile = null;
      continue;
    }
    const hunk = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk && currentFile) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      if (count === 0) continue;
      const lines = addedLines.get(currentFile) ?? new Set<number>();
      for (let l = start; l < start + count; l++) lines.add(l);
      addedLines.set(currentFile, lines);
    }
  }
  return addedLines;
}

function git(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

export interface Violation {
  file: string;
  line: number;
  excerpt: string;
}

export interface RevisionComparison {
  base: string;
  head: string;
}

export function parseComparisonArgs(args: string[]): RevisionComparison | undefined {
  if (args.length === 0) return undefined;

  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if ((flag !== "--base" && flag !== "--head") || !value || value.startsWith("--")) {
      throw new Error("Usage: no-new-comments.ts [--base <commit> --head <commit>]");
    }
    if (values.has(flag)) throw new Error(`${flag} may only be provided once`);
    values.set(flag, value);
  }

  const base = values.get("--base");
  const head = values.get("--head");
  if (!base || !head) throw new Error("Revision comparison requires both --base and --head");
  return { base, head };
}

function resolveCommit(ref: string): string {
  return git(["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).trim();
}

export function findCommentViolations(comparison?: RevisionComparison): Violation[] {
  const resolvedComparison = comparison
    ? { base: resolveCommit(comparison.base), head: resolveCommit(comparison.head) }
    : undefined;
  const diff = resolvedComparison
    ? git([
        "diff",
        "-U0",
        "--no-color",
        "--diff-filter=ACMR",
        `${resolvedComparison.base}...${resolvedComparison.head}`,
      ])
    : git(["diff", "--cached", "-U0", "--no-color", "--diff-filter=ACMR"]);
  const addedLinesByFile = parseAddedLines(diff);
  const violations: Violation[] = [];

  for (const [file, addedLines] of addedLinesByFile) {
    if (!CHECKED_EXTENSIONS.test(file) || GENERATED_FILE.test(file)) continue;
    const checkedContent = git([
      "show",
      resolvedComparison ? `${resolvedComparison.head}:${file}` : `:${file}`,
    ]);
    let comments: CommentHit[];
    try {
      comments = findComments(checkedContent, file);
    } catch (error) {
      console.warn(`no-new-comments: skipped ${file} (parse failed: ${error})`);
      continue;
    }
    const exempt = resolveExempt(comments, checkedContent);

    for (const [index, hit] of comments.entries()) {
      if (exempt[index]) continue;
      let touchesAddedLine = false;
      for (let l = hit.startLine; l <= hit.endLine; l++) {
        if (addedLines.has(l)) {
          touchesAddedLine = true;
          break;
        }
      }
      if (!touchesAddedLine) continue;
      const excerpt = (hit.text.split("\n")[0] ?? hit.text).trim().slice(0, 80);
      violations.push({ file, line: hit.startLine, excerpt });
    }
  }

  return violations;
}

export function findStagedCommentViolations(): Violation[] {
  return findCommentViolations();
}

if (import.meta.main) {
  console.log(SIMPLICITY_REMINDER);
  let comparison: RevisionComparison | undefined;
  try {
    comparison = parseComparisonArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(2);
  }
  const violations = findCommentViolations(comparison);
  if (violations.length > 0) {
    console.error(
      `\n✖ Comments detected in ${comparison ? "introduced changes" : "staged changes"}:\n`
    );
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  ${v.excerpt}`);
    }
    console.error(
      [
        "",
        "Simplify your code: if it needs a comment, it needs cleaner code instead.",
        "Rename the variable, extract a well-named function, or restructure the",
        "logic until the comment has nothing left to say.",
        "",
        "Tool directives (biome-ignore, @ts-expect-error, ...) are exempt.",
        "If the code truly cannot say it, keep one line as `// what: <explanation>`.",
        "Block, multiline, empty, trivial, and consecutive explanations will not pass.",
        "",
      ].join("\n")
    );
    process.exit(1);
  }
}
