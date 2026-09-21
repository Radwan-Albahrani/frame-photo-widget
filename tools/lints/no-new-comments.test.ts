import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findComments,
  isAllowedDirective,
  isJustifiedComment,
  parseAddedLines,
  parseComparisonArgs,
  resolveExempt,
  SIMPLICITY_REMINDER,
} from "./no-new-comments";

const SCRIPT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "no-new-comments.ts");

describe("findComments", () => {
  test("flags line comments with their line number", () => {
    const hits = findComments("const a = 1;\nconst b = 2; // trailing note\n", "a.ts");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.startLine).toBe(2);
    expect(hits[0]?.text).toBe("// trailing note");
  });

  test("flags block comments spanning multiple lines", () => {
    const hits = findComments("/*\n explains\n things\n*/\nconst a = 1;\n", "a.ts");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.startLine).toBe(1);
    expect(hits[0]?.endLine).toBe(4);
  });

  test("flags JSDoc blocks", () => {
    const hits = findComments(
      "/** adds two numbers */\nconst add = (a: number, b: number) => a + b;\n",
      "a.ts"
    );
    expect(hits).toHaveLength(1);
  });

  test("flags JSX expression comments", () => {
    const hits = findComments("const el = <div>{/* hidden */}</div>;\n", "a.tsx");
    expect(hits).toHaveLength(1);
  });

  test("does not flag slashes inside JSX text", () => {
    const source = "const el = (\n  <div>\n    see https://x.com//path or a/b\n  </div>\n);\n";
    expect(findComments(source, "a.tsx")).toHaveLength(0);
    expect(findComments(source, "a.jsx")).toHaveLength(0);
  });

  test("does not flag slashes inside JSX attribute strings", () => {
    const source = 'const el = <img src="https://x.com//img.png" alt="a // b" />;\n';
    expect(findComments(source, "a.tsx")).toHaveLength(0);
  });

  test("does not flag slashes inside string literals", () => {
    expect(findComments('const url = "https://example.com//path";\n', "a.ts")).toHaveLength(0);
    expect(findComments("const url = 'http://x.com';\n", "a.ts")).toHaveLength(0);
    expect(findComments('const s = "/* not a comment */";\n', "a.ts")).toHaveLength(0);
  });

  test("does not flag slashes inside template literals and their expressions", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: fixture is raw source under test
    const source = "const u = `https://x.com/${id}/edit?q=${a / b}`;\n";
    expect(findComments(source, "a.ts")).toHaveLength(0);
  });

  test("finds comments after nested template expressions end", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: fixture is raw source under test
    const source = "const u = `a${`b${c}`}d`; // after templates\n";
    const hits = findComments(source, "a.ts");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe("// after templates");
  });

  test("does not flag slashes inside regex literals", () => {
    expect(findComments("const re = /\\/\\/[a-z/]+/g;\n", "a.ts")).toHaveLength(0);
    expect(findComments("const m = s.match(/https:\\/\\//);\n", "a.ts")).toHaveLength(0);
    expect(findComments("if (x) /foo\\/\\/bar/.test(s);\n", "a.ts")).toHaveLength(0);
    expect(findComments("const c = /[/]/.test(s);\n", "a.ts")).toHaveLength(0);
  });

  test("distinguishes division from regex and still finds real comments", () => {
    const hits = findComments("const half = total / 2; // halve it\n", "a.ts");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe("// halve it");
    expect(findComments("const r = (a) / b / c;\nconst q = a++ / 2;\n", "a.ts")).toHaveLength(0);
  });

  test("handles TypeScript angle-bracket assertions in .ts files", () => {
    const hits = findComments("const a = <string>value; // cast note\n", "a.ts");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe("// cast note");
  });

  test("handles generic arrow functions in .tsx files", () => {
    const hits = findComments("const id = <T,>(v: T) => v; // generic note\n", "a.tsx");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe("// generic note");
  });

  test("handles class and parameter decorators", () => {
    const source =
      "@Injectable()\nclass A {\n  constructor(@Inject(B) readonly b: B) {}\n} // di note\n";
    const hits = findComments(source, "a.ts");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe("// di note");
  });

  test("does not flag shebang lines", () => {
    expect(findComments("#!/usr/bin/env bun\nconst a = 1;\n", "a.ts")).toHaveLength(0);
  });

  test("counts lines correctly across strings with escapes", () => {
    const source = 'const s = "a\\nb";\nconst t = 1;\n// note\n';
    const hits = findComments(source, "a.ts");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.startLine).toBe(3);
  });

  test("still reports comments in files with syntax errors via error recovery", () => {
    const hits = findComments("let a = 1;\nlet a = 2; // broken but commented\n", "a.ts");
    expect(hits.some((h) => h.text.includes("broken but commented"))).toBe(true);
  });
});

describe("isAllowedDirective", () => {
  test("exempts tooling directives", () => {
    expect(isAllowedDirective("// biome-ignore lint/suspicious/noExplicitAny: boundary")).toBe(
      true
    );
    expect(isAllowedDirective("// @ts-expect-error upstream types are wrong")).toBe(true);
    expect(isAllowedDirective('/// <reference types="bun" />')).toBe(true);
    expect(isAllowedDirective("/* @__PURE__ */")).toBe(true);
    expect(isAllowedDirective("// prettier-ignore")).toBe(true);
    expect(isAllowedDirective("// react-doctor-disable-next-line no-unstable-context-value")).toBe(
      true
    );
    expect(isAllowedDirective("// oxlint-disable-next-line no-unused-vars")).toBe(true);
    expect(isAllowedDirective("/** @type {import('tailwindcss').Config} */")).toBe(true);
  });

  test("exempts the biome-plugin fixture expectation markers", () => {
    expect(isAllowedDirective("// EXPECT_FAIL: bare throw with a literal message")).toBe(true);
    expect(isAllowedDirective("// EXPECT_PASS: structured error carrying why and fix")).toBe(true);
    expect(isAllowedDirective("// EXPECTED to be flagged one day")).toBe(false);
  });

  test("does not exempt prose", () => {
    expect(isAllowedDirective("// increment the counter")).toBe(false);
    expect(isAllowedDirective("/* this explains the code */")).toBe(false);
    expect(isAllowedDirective("// TODO: fix later")).toBe(false);
    expect(isAllowedDirective("/** adds two numbers */")).toBe(false);
  });
});

describe("isJustifiedComment", () => {
  test("allows one-line what: comments carrying a real explanation", () => {
    expect(
      isJustifiedComment("// what: mapbox v3 exports GeoJSONSource type-only, instanceof crashes")
    ).toBe(true);
    expect(
      isJustifiedComment("// WHAT: BullMQ jobIds cannot contain colons, keep the slug flat")
    ).toBe(true);
  });

  test("rejects what: escape hatches that are not one-line // comments", () => {
    expect(isJustifiedComment("/* what: this block stays on one physical line */")).toBe(false);
    expect(
      isJustifiedComment(
        "/* what: KSA timestamps have no offset,\nraw Date.parse skews three hours */"
      )
    ).toBe(false);
  });

  test("rejects empty or trivial justifications", () => {
    expect(isJustifiedComment("// what:")).toBe(false);
    expect(isJustifiedComment("// what: because")).toBe(false);
    expect(isJustifiedComment("// what:          ")).toBe(false);
  });

  test("rejects the legacy why: prefix and unrelated prefixes", () => {
    expect(
      isJustifiedComment("// why: upstream SDK mutates the input array, defensive copy required")
    ).toBe(false);
    expect(isJustifiedComment("// increment the counter carefully here")).toBe(false);
    expect(isJustifiedComment("// reason: this is not the sanctioned prefix")).toBe(false);
  });
});

describe("resolveExempt", () => {
  const exemptFor = (source: string) => resolveExempt(findComments(source, "a.ts"), source);

  test("does not carry a what: exemption to the next line", () => {
    expect(
      exemptFor(
        "// what: upstream reads this too early\n// so it bakes in the wrong value\nconst a = 1;\n"
      )
    ).toEqual([true, false]);
  });

  test("does not exempt legacy why: blocks", () => {
    expect(
      exemptFor("// why: upstream reads this too early\n// so it bakes in the wrong value\n")
    ).toEqual([false, false]);
  });

  test("a tool directive does not license the comment below it", () => {
    expect(
      exemptFor("// biome-ignore lint/suspicious/noExplicitAny: needed\n// unrelated prose\n")
    ).toEqual([true, false]);
  });

  test("rejects consecutive what: comments, including across blank lines", () => {
    expect(
      exemptFor(
        "// what: upstream mutates the input array before validation\n\n// what: defensive copying preserves the original request\n"
      )
    ).toEqual([false, false]);
  });

  test("allows separate what: comments when code appears between them", () => {
    expect(
      exemptFor(
        "// what: upstream mutates the input array before validation\nconst first = [...input];\n// what: downstream caches the object identity during setup\nconst second = { ...input };\n"
      )
    ).toEqual([true, true]);
  });
});

describe("parseAddedLines", () => {
  test("maps hunk headers to added line numbers per file", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -10,0 +11,2 @@",
      "+const a = 1;",
      "+const b = 2;",
      "@@ -20 +23 @@",
      "+const c = 3;",
      "",
    ].join("\n");
    const added = parseAddedLines(diff);
    expect([...(added.get("src/a.ts") ?? [])].sort((x, y) => x - y)).toEqual([11, 12, 23]);
  });

  test("skips pure deletions", () => {
    const diff = ["+++ b/src/a.ts", "@@ -5,2 +4,0 @@", "-gone", "-gone too", ""].join("\n");
    expect(parseAddedLines(diff).get("src/a.ts")).toBeUndefined();
  });
});

describe("parseComparisonArgs", () => {
  test("accepts an explicit base and head", () => {
    expect(parseComparisonArgs(["--base", "base-sha", "--head", "head-sha"])).toEqual({
      base: "base-sha",
      head: "head-sha",
    });
  });

  test("rejects incomplete and unknown comparison arguments", () => {
    expect(() => parseComparisonArgs(["--base", "base-sha"])).toThrow(
      "requires both --base and --head"
    );
    expect(() => parseComparisonArgs(["--unknown", "value"])).toThrow("Usage:");
    expect(() => parseComparisonArgs(["--base", "one", "--base", "two"])).toThrow(
      "--base may only be provided once"
    );
  });
});

describe("pre-commit integration", () => {
  const setupRepo = () => {
    const repo = mkdtempSync(join(tmpdir(), "no-new-comments-"));
    const run = (args: string[]) => {
      const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
      expect(result.status).toBe(0);
      return result.stdout;
    };
    run(["init", "-q"]);
    run(["config", "user.email", "test@test"]);
    run(["config", "user.name", "test"]);
    return { repo, run };
  };

  const runLinter = (repo: string, args: string[] = []) =>
    spawnSync("bun", [SCRIPT_PATH, ...args], { cwd: repo, encoding: "utf8" });

  test("fails when a staged file adds a comment", () => {
    const { repo, run } = setupRepo();
    writeFileSync(join(repo, "a.ts"), "const a = 1; // why\n");
    run(["add", "a.ts"]);
    const result = runLinter(repo);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(SIMPLICITY_REMINDER);
    expect(result.stderr).toContain("a.ts:1");
    expect(result.stderr).toContain("Simplify your code");
    expect(result.stderr).toContain("keep one line as `// what: <explanation>`");
    rmSync(repo, { recursive: true, force: true });
  });

  test("passes on comment-free staged changes and ignores unstaged comments", () => {
    const { repo, run } = setupRepo();
    writeFileSync(join(repo, "a.ts"), "const a = 1;\n");
    run(["add", "a.ts"]);
    writeFileSync(join(repo, "a.ts"), "const a = 1; // unstaged\n");
    const result = runLinter(repo);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(SIMPLICITY_REMINDER);
    rmSync(repo, { recursive: true, force: true });
  });

  test("ignores pre-existing comments when other lines change", () => {
    const { repo, run } = setupRepo();
    writeFileSync(join(repo, "a.ts"), "// legacy header\nconst a = 1;\n");
    run(["add", "a.ts"]);
    run(["commit", "-qm", "seed", "--no-verify"]);
    writeFileSync(join(repo, "a.ts"), "// legacy header\nconst a = 1;\nconst b = 2;\n");
    run(["add", "a.ts"]);
    const result = runLinter(repo);
    expect(result.status).toBe(0);
    rmSync(repo, { recursive: true, force: true });
  });

  test("allows tool directives on added lines", () => {
    const { repo, run } = setupRepo();
    writeFileSync(
      join(repo, "a.ts"),
      "const a: number = JSON.parse('1');\n// biome-ignore lint/suspicious/noExplicitAny: boundary\nconst b = a as never;\n"
    );
    run(["add", "a.ts"]);
    const result = runLinter(repo);
    expect(result.status).toBe(0);
    rmSync(repo, { recursive: true, force: true });
  });

  test("allows one-line what: comments but rejects trivial, multiline, and legacy forms", () => {
    const { repo, run } = setupRepo();
    writeFileSync(
      join(repo, "justified.ts"),
      "// what: upstream SDK mutates the input array, defensive copy required\nconst a = 1;\n"
    );
    writeFileSync(join(repo, "trivial.ts"), "// what: because\nconst b = 2;\n");
    writeFileSync(
      join(repo, "multiline.ts"),
      "/* what: KSA timestamps have no offset,\nraw Date.parse skews three hours */\nconst c = 3;\n"
    );
    writeFileSync(
      join(repo, "legacy.ts"),
      "// why: upstream SDK mutates the input array, defensive copy required\nconst d = 4;\n"
    );
    run(["add", "."]);
    const result = runLinter(repo);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("trivial.ts:1");
    expect(result.stderr).toContain("multiline.ts:1");
    expect(result.stderr).toContain("legacy.ts:1");
    expect(result.stderr).not.toContain("justified.ts");
    rmSync(repo, { recursive: true, force: true });
  });

  test("rejects consecutive what: comments separated only by whitespace", () => {
    const { repo, run } = setupRepo();
    writeFileSync(
      join(repo, "adjacent.ts"),
      "// what: upstream mutates the input array before validation\n\n// what: defensive copying preserves the original request\nconst a = 1;\n"
    );
    run(["add", "adjacent.ts"]);
    const result = runLinter(repo);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("adjacent.ts:1");
    expect(result.stderr).toContain("adjacent.ts:3");
    expect(result.stderr).toContain("consecutive explanations will not pass");
    rmSync(repo, { recursive: true, force: true });
  });

  test("rejects consecutive what: comments introduced between two commits", () => {
    const { repo, run } = setupRepo();
    writeFileSync(join(repo, "base.ts"), "export const base = true;\n");
    run(["add", "base.ts"]);
    run(["commit", "-qm", "base", "--no-verify"]);
    const base = run(["rev-parse", "HEAD"]).trim();

    writeFileSync(
      join(repo, "introduced.ts"),
      "// what: upstream mutates the input array before validation\n// what: defensive copying preserves the original request\nexport const introduced = true;\n"
    );
    run(["add", "introduced.ts"]);
    run(["commit", "-qm", "head", "--no-verify"]);

    const result = runLinter(repo, ["--base", base, "--head", "HEAD"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Comments detected in introduced changes");
    expect(result.stderr).toContain("introduced.ts:1");
    expect(result.stderr).toContain("introduced.ts:2");
    rmSync(repo, { recursive: true, force: true });
  });

  test("skips generated and non-source files", () => {
    const { repo, run } = setupRepo();
    mkdirSync(join(repo, "src"));
    writeFileSync(join(repo, "src", "routeTree.gen.ts"), "// generated\nexport const x = 1;\n");
    writeFileSync(join(repo, "notes.md"), "// not code\n");
    run(["add", "."]);
    const result = runLinter(repo);
    expect(result.status).toBe(0);
    rmSync(repo, { recursive: true, force: true });
  });

  test("flags comments in staged tsx files but not JSX text slashes", () => {
    const { repo, run } = setupRepo();
    writeFileSync(
      join(repo, "clean.tsx"),
      "export const El = () => <a href=''>https://x.com//p</a>;\n"
    );
    writeFileSync(
      join(repo, "dirty.tsx"),
      "export const El = () => <div>{/* layout hack */}ok</div>;\n"
    );
    run(["add", "."]);
    const result = runLinter(repo);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("dirty.tsx:1");
    expect(result.stderr).not.toContain("clean.tsx");
    rmSync(repo, { recursive: true, force: true });
  });
});
