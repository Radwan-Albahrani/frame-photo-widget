import { describe, expect, it } from "vitest";
import { findSilentFailures, REPORTERS } from "./no-silent-failures";

function kinds(source: string): string[] {
  return findSilentFailures(source).map((hit) => hit.kind);
}

describe("findSilentFailures", () => {
  it("flags an empty catch block", () => {
    expect(kinds("try { risky(); } catch {}")).toEqual(["emptyCatch"]);
  });

  it("flags an empty catch block that binds the error", () => {
    expect(kinds("try { risky(); } catch (error) {\n}")).toEqual(["emptyCatch"]);
  });

  it("flags a swallowed rejection", () => {
    expect(kinds("void send().catch(() => {});")).toEqual(["swallowedRejection"]);
  });

  it("flags a swallowed rejection written as a function expression", () => {
    expect(kinds("void send().catch(function () {});")).toEqual(["swallowedRejection"]);
  });

  it("flags a swallowed rejection through optional chaining", () => {
    expect(kinds("void native?.begin?.()?.catch(() => {});")).toEqual(["swallowedRejection"]);
  });

  it("rejects a catch whose report carries no dimensions", () => {
    expect(kinds('try { risky(); } catch (error) { logger.warn("failed", error); }')).toEqual([
      "narrowReport",
    ]);
  });

  it("accepts a catch that emits a wide event", () => {
    const source =
      'try { risky(); } catch (error) { logger.warn("profile.refresh", { op: "profile.refresh", fingerprint, error }); }';
    expect(kinds(source)).toEqual([]);
  });

  it("accepts a catch that recovers with a value", () => {
    expect(kinds("function f() { try { return parse(raw); } catch { return null; } }")).toEqual([]);
  });

  it("rejects a rejection handler whose report carries no dimensions", () => {
    expect(kinds("void send().catch((error) => logger.warn(error));")).toEqual(["narrowReport"]);
  });

  it("accepts a rejection handler that emits a wide event", () => {
    const source =
      'void send().catch((error) => reportFailure({ op: "send", id, attempt }, error));';
    expect(kinds(source)).toEqual([]);
  });

  it("ignores a handler that does not report at all, since it recovers instead", () => {
    expect(kinds("void send().catch((error) => setState({ failed: true }));")).toEqual([]);
  });

  it("ignores a catch on a non-promise member named catch with two arguments", () => {
    expect(kinds("emitter.catch(() => {}, other);")).toEqual([]);
  });

  it("finds every offence in a file, not just the first", () => {
    const source = "try { a(); } catch {}\nvoid b().catch(() => {});\ntry { c(); } catch {}";
    expect(kinds(source)).toEqual(["emptyCatch", "swallowedRejection", "emptyCatch"]);
  });

  it("reports the line so the message is actionable", () => {
    const source = "const x = 1;\nconst y = 2;\ntry { a(); } catch {}";
    expect(findSilentFailures(source)).toEqual([{ line: 3, kind: "emptyCatch" }]);
  });

  it("parses tsx without tripping on generics or JSX", () => {
    const source = "const f = <T,>(v: T) => v;\nconst el = <View />;\ntry { a(); } catch {}";
    expect(kinds(source)).toEqual(["emptyCatch"]);
  });

  it("parses a .ts generic arrow, which the jsx plugin would reject", () => {
    const source = "const f = <T>(v: T): T => v;\ntry { a(); } catch {}";
    expect(findSilentFailures(source, "thing.ts").map((h) => h.kind)).toEqual(["emptyCatch"]);
  });

  it("still parses jsx when the file is .tsx", () => {
    expect(findSilentFailures("const el = <View />;\ntry { a(); } catch {}", "S.tsx")).toHaveLength(
      1
    );
  });
});

describe("the `// what:` escape hatch", () => {
  it("excuses a catch justified on the line above", () => {
    const source = "try { a(); } catch {}".replace(
      "try",
      "// what: a corrupt cache entry is expected, the default below is the recovery\ntry"
    );
    expect(kinds(source)).toEqual([]);
  });

  it("excuses a swallowed rejection justified on the line above", () => {
    const source =
      "// what: fire and forget, the caller already reported the failure\nvoid s().catch(() => {});";
    expect(kinds(source)).toEqual([]);
  });

  it("excuses a catch justified inside the empty block", () => {
    expect(
      kinds("try { a(); } catch {\n  // what: nothing to do, the value is optional by design\n}")
    ).toEqual([]);
  });

  it("does not accept an unrelated comment as justification", () => {
    expect(kinds("// TODO handle this\ntry { a(); } catch {}")).toEqual(["emptyCatch"]);
  });

  it("still flags a neighbouring offence that carries no justification", () => {
    const source =
      "// what: a corrupt cache entry is expected here and the default is the recovery\ntry { a(); } catch {}\ntry { b(); } catch {}";
    expect(kinds(source)).toEqual(["emptyCatch"]);
  });
});

describe("anchoring", () => {
  it("accepts a `// what:` above the try, not just above the catch", () => {
    const source = [
      "// what: a blob from an older shape must read as no preference at all",
      "try {",
      "  obs.set(JSON.parse(stored));",
      "} catch {}",
    ].join("\n");
    expect(kinds(source)).toEqual([]);
  });

  it("reports the catch line, not the try line, so the message points at the silence", () => {
    const source = "try {\n  a();\n} catch {}";
    expect(findSilentFailures(source)).toEqual([{ line: 3, kind: "emptyCatch" }]);
  });

  it("flags a try whose catch is empty even when the try block is long", () => {
    const source = `try {\n${"  a();\n".repeat(20)}} catch {}`;
    expect(kinds(source)).toEqual(["emptyCatch"]);
  });

  it("does not flag a try with only a finally", () => {
    expect(kinds("try { a(); } finally { b(); }")).toEqual([]);
  });
});

describe("wide events", () => {
  it("counts a lone { error } as narrow, because it names no entity", () => {
    expect(kinds('try { a(); } catch (e) { logger.warn("boom", { error: e }); }')).toEqual([
      "narrowReport",
    ]);
  });

  it("accepts one dimension beyond the error", () => {
    expect(
      kinds('try { a(); } catch (e) { logger.warn("boom", { provider, error: e }); }')
    ).toEqual([]);
  });

  it("accepts a spread, which carries dimensions it cannot enumerate", () => {
    expect(
      kinds('try { a(); } catch (e) { logger.warn("boom", { ...event, error: e }); }')
    ).toEqual([]);
  });

  it("accepts reportFailure with an op and a dimension", () => {
    const source = 'try { a(); } catch (e) { reportFailure({ op: "memory.touch", memories }, e); }';
    expect(kinds(source)).toEqual([]);
  });

  it("treats a bare op with no dimensions as narrow", () => {
    expect(kinds('try { a(); } catch (e) { logger.error("failed"); }')).toEqual(["narrowReport"]);
  });

  it("accepts beginDebugEvent carrying dimensions", () => {
    const source = 'try { a(); } catch (e) { beginDebugEvent("live", "audio", { frames, peak }); }';
    expect(kinds(source)).toEqual([]);
  });

  it("reports the narrow call line, so the message points at the report", () => {
    const source = 'try {\n  a();\n} catch (e) {\n  logger.warn("boom", e);\n}';
    expect(findSilentFailures(source)).toEqual([{ line: 4, kind: "narrowReport" }]);
  });

  it("takes the widest report when a handler emits several", () => {
    const source =
      'try { a(); } catch (e) { logger.warn("a"); logger.warn("b", { id, error: e }); }';
    expect(kinds(source)).toEqual([]);
  });

  it("still allows a `// what:` to excuse a deliberately terse report", () => {
    const source =
      '// what: the op name is the only useful dimension for a module-scope boot failure\ntry { a(); } catch (e) { logger.warn("boot", e); }';
    expect(kinds(source)).toEqual([]);
  });
});

describe("console", () => {
  it("does not treat console.error as the structured channel", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: this is source text under test, not a template
    const source = "try { a(); } catch (e) { console.error(`failed model=${m}`, e); }";
    expect(kinds(source)).toEqual([]);
  });

  it("does not treat console.warn as the structured channel", () => {
    expect(kinds('try { a(); } catch (e) { console.warn("failed", e); }')).toEqual([]);
  });

  it("still flags logger.error alongside a console call", () => {
    const source = 'try { a(); } catch (e) { console.error(e); logger.error("boom", e); }';
    expect(kinds(source)).toEqual(["narrowReport"]);
  });

  it("still requires a non-empty handler even when console is the medium", () => {
    expect(kinds("void s().catch(() => {});")).toEqual(["swallowedRejection"]);
  });
});

describe("an event object passed by reference", () => {
  it("accepts a report forwarding a context object it cannot enumerate", () => {
    const source = "try { a(); } catch (err) { reportFailure(event, err); }";
    expect(kinds(source)).toEqual([]);
  });

  it("still flags a report passing only the caught error", () => {
    expect(kinds('try { a(); } catch (err) { logger.warn("boom", err); }')).toEqual([
      "narrowReport",
    ]);
  });

  it("still flags a rejection handler passing only its own binding", () => {
    expect(kinds("void s().catch((error) => logger.warn(error));")).toEqual(["narrowReport"]);
  });

  it("accepts a rejection handler forwarding a separate context object", () => {
    expect(kinds("void s().catch((error) => reportFailure(event, error));")).toEqual([]);
  });

  it("flags a catch with no binding that reports only a message", () => {
    expect(kinds('try { a(); } catch { logger.warn("boom"); }')).toEqual(["narrowReport"]);
  });

  // what: an unrecognised reporter makes the narrow-report check pass silently, so the set is pinned.
  it("pins the reporter names the gate recognises", () => {
    expect([...REPORTERS].sort()).toEqual(["beginDebugEvent", "error", "reportFailure", "warn"]);
  });
});
