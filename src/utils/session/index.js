import { v4 as uuidv4 } from "uuid";

const sessions = new Map();

const initialState = (sessionId) => ({
  sessionId,
  sessionMemory: [],
});

const createSessionState = () => {
  const sessionId = uuidv4();
  sessions.set(sessionId, initialState(sessionId));
  return sessionId;
};
export { createSessionState as createSession };

const getSessionState = (sessionId) => {
  if (!sessionId) throw new Error("sessionId required");
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Invalid session");
  return JSON.parse(JSON.stringify(session));
};

const updateSessionState = (sessionId, updatedState) => {
  sessions.set(sessionId, updatedState);
};

export const getSession = (sessionId) => {
  return {
    getId: function () {
      return sessionId;
    },
    getMemory: function () {
      const session = getSessionState(sessionId);
      return session.sessionMemory;
    },
    appendToMemory: function (item) {
      let session = getSessionState(sessionId);
      session.sessionMemory = [...session.sessionMemory, item];
      updateSessionState(sessionId, session);
    },
    clear() {
      sessions.delete(sessionId);
    },
  };
};
