import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { checkCommitSubject, COMMIT_TYPES, subjectOf } from "./commit-message";

function kinds(subject: string) {
  return checkCommitSubject(subject).map((problem) => problem.kind);
}

describe("commit message lint", () => {
  it("accepts every type the history uses", () => {
    for (const type of COMMIT_TYPES) {
      expect(kinds(`${type}: something happened`)).toEqual([]);
    }
  });

  it("accepts a scope, a slash in a scope, and a breaking marker", () => {
    expect(kinds("fix(live): the socket says why it was refused")).toEqual([]);
    expect(kinds("feat(i18n/ios): arabic dates render in the picker")).toEqual([]);
    expect(kinds("refactor!: services are classes of static members")).toEqual([]);
  });

  it("accepts the long sentence subjects this repo writes", () => {
    expect(
      kinds(
        "refactor: the logging subsystem and the model-aware domain helpers live in core, so common imports nothing above it"
      )
    ).toEqual([]);
  });

  it("rejects a subject with no type at all", () => {
    expect(kinds("recent activity rows open the episode")).toEqual(["noType"]);
    expect(kinds("live voice mode: one realtime session across three providers")).toEqual([
      "noType",
    ]);
  });

  it("rejects a type that is not one of ours", () => {
    expect(kinds("update: bump the provider")).toEqual(["unknownType"]);
    expect(kinds("Fix: capitalised type")).toEqual(["unknownType"]);
  });

  it("rejects an empty description and a trailing full stop", () => {
    expect(kinds("fix: ")).toEqual(["emptyDescription"]);
    expect(kinds("fix: the socket says why it was refused.")).toEqual(["trailingPeriod"]);
  });

  it("lets git's own generated subjects through", () => {
    expect(kinds("Merge branch 'main' into 1.4.0")).toEqual([]);
    expect(kinds('Revert "feat: a kill switch for the assistant"')).toEqual([]);
    expect(kinds("fixup! fix: the socket says why it was refused")).toEqual([]);
  });

  it("reads the subject past git's comment lines", () => {
    expect(subjectOf("# please enter the commit message\n\nfix: the real subject\n")).toBe(
      "fix: the real subject"
    );
  });

  it("holds the branch's own history to the rule", () => {
    const log = (range: string) =>
      execFileSync("git", ["log", "--pretty=%s", range], { encoding: "utf8" })
        .split("\n")
        .filter((line) => line.length > 0);

    const branchOnly = log("origin/main..HEAD");
    const subjects = branchOnly.length > 0 ? branchOnly : log("-25");

    expect(subjects.length).toBeGreaterThan(0);
    expect(subjects.filter((subject) => checkCommitSubject(subject).length > 0)).toEqual([]);
  });
});
