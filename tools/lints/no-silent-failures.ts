// what: a failure nobody can see costs a device round trip to find, which is why this is a gate and not advice.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";
import { parseAddedLines } from "./no-new-comments";

export interface SilentFailure {
  line: number;
  kind: "emptyCatch" | "swallowedRejection" | "narrowReport";
}

export const REPORTERS = new Set(["warn", "error", "reportFailure", "beginDebugEvent"]);

interface Node {
  type: string;
  start?: number;
  end?: number;
  loc?: { start: { line: number }; end: { line: number } };
  [key: string]: unknown;
}

function isEmptyBlock(node: unknown): boolean {
  const block = node as Node | null | undefined;
  if (block?.type !== "BlockStatement") return false;
  return (block.body as unknown[]).length === 0;
}

function isSilentHandler(node: unknown): boolean {
  const fn = node as Node | null | undefined;
  if (!fn) return false;
  if (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression") return false;
  return isEmptyBlock(fn.body);
}

// what: console is a terminal medium, not the structured channel, so its dimensions ride in the string.
function calleeName(node: Node): string | null {
  const callee = node.callee as Node | undefined;
  if (!callee) return null;
  if (callee.type === "Identifier") return (callee.name as string) ?? null;
  if (callee.type === "MemberExpression" || callee.type === "OptionalMemberExpression") {
    const object = callee.object as Node | undefined;
    if (object?.name === "console") return null;
    const property = callee.property as Node | undefined;
    return (property?.name as string) ?? null;
  }
  return null;
}

// what: a report with no dimension beyond the error is as unactionable as silence, which is the whole point here.
function dimensionCount(node: Node, errorBinding: string | null): number {
  let widest = 0;
  for (const arg of (node.arguments as unknown[]) ?? []) {
    const object = arg as Node | null;
    if (!object) continue;
    if (object.type === "Identifier" && object.name !== errorBinding) {
      return Number.POSITIVE_INFINITY;
    }
    if (object.type !== "ObjectExpression") continue;
    let dimensions = 0;
    for (const raw of (object.properties as unknown[]) ?? []) {
      const property = raw as Node;
      if (property.type === "SpreadElement") return Number.POSITIVE_INFINITY;
      const key = property.key as Node | undefined;
      const name = (key?.name as string) ?? (key?.value as string) ?? "";
      if (name !== "error" && name !== "err") dimensions += 1;
    }
    widest = Math.max(widest, dimensions);
  }
  return widest;
}

function walk(node: unknown, visit: (node: Node) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  const current = node as Node;
  if (typeof current.type === "string") visit(current);
  for (const [key, value] of Object.entries(current)) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments") continue;
    walk(value, visit);
  }
}

// what: the jsx plugin makes `<T>(v: T) => v` a parse error in .ts, so the extension picks the plugin set.
export function findSilentFailures(source: string, file = "input.tsx"): SilentFailure[] {
  const ast = parse(source, {
    sourceType: "module",
    plugins: file.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"],
  });
  const found: SilentFailure[] = [];
  const justified = new Set<number>();
  for (const comment of ast.comments ?? []) {
    const text = (comment as unknown as { value?: string }).value ?? "";
    const at = (comment as unknown as Node).loc?.start.line;
    if (at !== undefined && /^\s*what:/.test(text)) justified.add(at);
  }

  function narrowReportIn(handlerBody: unknown, errorBinding: string | null): number | null {
    let reported = false;
    let widest = 0;
    let firstLine: number | null = null;
    walk(handlerBody, (inner) => {
      if (inner.type !== "CallExpression" && inner.type !== "OptionalCallExpression") return;
      const name = calleeName(inner);
      if (name === null || !REPORTERS.has(name)) return;
      reported = true;
      if (firstLine === null) firstLine = inner.loc?.start.line ?? null;
      widest = Math.max(widest, dimensionCount(inner, errorBinding));
    });
    if (!reported || widest > 0) return null;
    return firstLine;
  }

  function excused(node: Node): boolean {
    const from = node.loc?.start.line;
    const to = node.loc?.end.line;
    if (from === undefined || to === undefined) return false;
    for (let l = from - 1; l <= to; l++) if (justified.has(l)) return true;
    return false;
  }

  walk(ast.program, (node) => {
    const line = node.loc?.start.line;
    if (line === undefined) return;
    if (node.type === "TryStatement") {
      const handler = node.handler as Node | undefined;
      const at = handler?.loc?.start.line;
      if (!handler || at === undefined) return;
      if (isEmptyBlock(handler.body)) {
        if (!excused(node)) found.push({ line: at, kind: "emptyCatch" });
        return;
      }
      const bound = handler.param as Node | undefined;
      const narrow = narrowReportIn(handler.body, (bound?.name as string) ?? null);
      if (narrow !== null && !excused(node)) found.push({ line: narrow, kind: "narrowReport" });
      return;
    }
    if (node.type !== "CallExpression" && node.type !== "OptionalCallExpression") return;
    const callee = node.callee as Node | undefined;
    if (!callee) return;
    if (callee.type !== "MemberExpression" && callee.type !== "OptionalMemberExpression") return;
    const property = callee.property as Node | undefined;
    if (property?.name !== "catch") return;
    const args = node.arguments as unknown[];
    if (args.length !== 1) return;
    if (isSilentHandler(args[0])) {
      if (!excused(node)) found.push({ line, kind: "swallowedRejection" });
      return;
    }
    const handler = args[0] as Node | null;
    if (!handler) return;
    if (handler.type !== "ArrowFunctionExpression" && handler.type !== "FunctionExpression") return;
    const bound = (handler.params as unknown[])?.[0] as Node | undefined;
    const narrow = narrowReportIn(handler.body, (bound?.name as string) ?? null);
    if (narrow !== null && !excused(node)) found.push({ line: narrow, kind: "narrowReport" });
  });

  return found;
}

const ADVICE = [
  "Every failure path must emit ONE wide event: an op plus the dimensions needed to act on it.",
  '  reportFailure({ op: "profile.markFailure", fingerprint, mode }, err)',
  '  bestEffort(repo.markFailed(db, id), { op: "proposal.markFailed", proposalId, kind })',
  "A bare message, or a lone { error }, is not enough: name the entity, the ids, the counts.",
  "If silence is genuinely right, put a `// what:` line on it saying why.",
].join("\n");

function git(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

function run(): void {
  const argv = process.argv.slice(2);
  const base = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : null;
  const head = argv.includes("--head") ? argv[argv.indexOf("--head") + 1] : null;
  const diff =
    base && head
      ? git(["diff", "-U0", "--no-color", "--diff-filter=ACMR", `${base}...${head}`])
      : git(["diff", "--cached", "-U0", "--no-color", "--diff-filter=ACMR"]);

  const offences: string[] = [];
  for (const [file, addedLines] of parseAddedLines(diff)) {
    if (!/\.tsx?$/.test(file) || file.startsWith("tools/lints/")) continue;
    let hits: SilentFailure[];
    try {
      hits = findSilentFailures(readFileSync(file, "utf8"), file);
    } catch (err) {
      console.warn(`no-silent-failures: skipped ${file} (${(err as Error).message})`);
      continue;
    }
    for (const hit of hits) {
      if (!addedLines.has(hit.line)) continue;
      const what =
        hit.kind === "emptyCatch"
          ? "empty catch"
          : hit.kind === "swallowedRejection"
            ? "swallowed rejection"
            : "narrow report (no dimension beyond the error)";
      offences.push(`  ${file}:${hit.line}  ${what}`);
    }
  }

  if (offences.length === 0) {
    console.log("no-silent-failures — every new failure path reports something.");
    return;
  }
  console.error(`\n✖ Silent failure paths introduced:\n${offences.join("\n")}\n\n${ADVICE}\n`);
  process.exit(1);
}

if (process.argv[1]?.includes("no-silent-failures")) run();
