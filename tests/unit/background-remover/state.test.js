import { describe, expect, it, vi } from "vitest";
import { cancelCurrentJob, commitResult, createSession, nextJob, pushHistory, redoHistory, resetSession, undoHistory } from "../../../js/background-remover/state.js";

describe("edit session", () => {
  it("uses monotonic last-job-wins commits", () => {
    const session = createSession();
    const first = nextJob(session);
    const second = nextJob(session);
    expect(commitResult(session, first, { objectUrl: "blob:stale" })).toBe(false);
    expect(commitResult(session, second, { objectUrl: "blob:current" })).toBe(true);
  });

  it("invalidates a cancelled job", () => {
    const session = createSession();
    const job = nextJob(session);
    cancelCurrentJob(session);
    expect(commitResult(session, job, {})).toBe(false);
  });

  it("supports bounded branching history", () => {
    const session = createSession();
    pushHistory(session, { value: 1 }, 2);
    pushHistory(session, { value: 2 }, 2);
    expect(undoHistory(session).value).toBe(1);
    expect(redoHistory(session).value).toBe(2);
    undoHistory(session);
    pushHistory(session, { value: 3 }, 2);
    expect(redoHistory(session)).toBeNull();
  });

  it("revokes session object URLs on reset", () => {
    URL.revokeObjectURL = vi.fn();
    const session = createSession();
    session.source = { objectUrl: "blob:source" };
    session.activeResult = { objectUrl: "blob:result" };
    resetSession(session);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
