export function createSession() {
  return {
    source: null,
    mode: "background",
    status: "empty",
    currentJobId: 0,
    activeResult: null,
    history: [],
    historyIndex: -1,
    authorizationConfirmed: false,
    prohibitedPurpose: false,
  };
}

export function nextJob(session) {
  session.currentJobId += 1;
  session.status = "queued";
  return session.currentJobId;
}

export function isCurrentJob(session, jobId) {
  return session.currentJobId === jobId;
}

export function commitResult(session, jobId, result) {
  if (!isCurrentJob(session, jobId)) return false;
  releaseResult(session.activeResult);
  session.activeResult = result;
  session.status = "completed";
  return true;
}

export function cancelCurrentJob(session) {
  session.currentJobId += 1;
  session.status = session.source ? "editing" : "empty";
}

export function pushHistory(session, entry, limit = 30) {
  session.history.splice(session.historyIndex + 1);
  session.history.push(structuredClone(entry));
  if (session.history.length > limit) session.history.shift();
  session.historyIndex = session.history.length - 1;
}

export function undoHistory(session) {
  if (session.historyIndex <= 0) return null;
  session.historyIndex -= 1;
  return structuredClone(session.history[session.historyIndex]);
}

export function redoHistory(session) {
  if (session.historyIndex >= session.history.length - 1) return null;
  session.historyIndex += 1;
  return structuredClone(session.history[session.historyIndex]);
}

export function releaseResult(result) {
  if (result?.objectUrl) URL.revokeObjectURL(result.objectUrl);
}

export function resetSession(session) {
  cancelCurrentJob(session);
  releaseResult(session.activeResult);
  if (session.source?.objectUrl) URL.revokeObjectURL(session.source.objectUrl);
  Object.assign(session, createSession());
}
