import { readFileSync } from "node:fs";

export type CommitMessageKind = "noType" | "unknownType" | "emptyDescription" | "trailingPeriod";

export interface CommitMessageProblem {
  kind: CommitMessageKind;
  detail: string;
}

export const COMMIT_TYPES = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "docs",
  "test",
  "chore",
  "build",
  "ci",
  "style",
  "revert",
] as const;

const SUBJECT = /^([a-z]+)(\(([^)]+)\))?(!)?: (.*)$/;
const GENERATED_PREFIXES = ["merge ", 'revert "', "fixup!", "squash!", "amend!"];

export const EXPLANATIONS: Record<CommitMessageKind, string> = {
  noType: `start the subject with one of: ${COMMIT_TYPES.join(", ")}, then ": "`,
  unknownType: `use one of: ${COMMIT_TYPES.join(", ")}`,
  emptyDescription: "say what the commit does after the colon",
  trailingPeriod: "drop the full stop; a subject is a title, not a sentence",
};

export function isGeneratedSubject(subject: string): boolean {
  const lower = subject.toLowerCase();
  return GENERATED_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function subjectOf(message: string): string {
  const firstLine = message
    .split("\n")
    .find((line) => !line.startsWith("#") && line.trim().length > 0);
  return firstLine?.trim() ?? "";
}

export function checkCommitSubject(subject: string): CommitMessageProblem[] {
  if (subject.length === 0 || isGeneratedSubject(subject)) return [];
  const match = SUBJECT.exec(subject);
  if (!match) {
    const looseType = /^([A-Za-z]+)(\([^)]*\))?!?\s*:/.exec(subject);
    return looseType
      ? [{ kind: "unknownType", detail: `"${looseType[1]}" is not a commit type` }]
      : [{ kind: "noType", detail: `"${subject.slice(0, 60)}" has no type prefix` }];
  }
  const [, type = "", , , , description = ""] = match;
  const problems: CommitMessageProblem[] = [];
  if (!(COMMIT_TYPES as readonly string[]).includes(type)) {
    problems.push({ kind: "unknownType", detail: `"${type}" is not a commit type` });
  }
  if (description.trim().length === 0) {
    problems.push({ kind: "emptyDescription", detail: "the description is empty" });
  }
  if (description.trimEnd().endsWith(".")) {
    problems.push({ kind: "trailingPeriod", detail: "the subject ends in a full stop" });
  }
  return problems;
}

function main(): void {
  const path = process.argv[2];
  if (!path) {
    console.error("commit-message: pass the path to the commit message file");
    process.exit(1);
  }
  const subject = subjectOf(readFileSync(path, "utf8"));
  const problems = checkCommitSubject(subject);
  if (problems.length === 0) process.exit(0);

  console.error("\n✖ Commit blocked: the subject does not carry a conventional type.\n");
  console.error(`  ${subject}\n`);
  for (const problem of problems) {
    console.error(`  [${problem.kind}] ${problem.detail}`);
    console.error(`      → ${EXPLANATIONS[problem.kind]}`);
  }
  console.error("\n  feat: a user can do something new");
  console.error("  fix: something that was wrong now works");
  console.error("  refactor: the same behaviour, in a better shape");
  console.error("  chore(deps): tooling, dependencies, housekeeping\n");
  console.error("  A scope is optional: fix(live): the socket says why it was refused\n");
  process.exit(1);
}

if (process.argv[1]?.endsWith("commit-message.ts")) main();
