import { createStreamingResponse } from "@/utils/sse.helper";
import { createErrorResponse } from "@/utils/http.helper";
import { ERROR_TYPES } from "@/constants";
import { AgentClient } from "@/utils/ai-client/agent";

export async function POST(request) {
  const body = await request.json();
  let { message, sessionId } = body || {};

  let isMessageEmpty = !message?.trim();
  let isSessionIdEmpty = !sessionId;
  if (isMessageEmpty || isSessionIdEmpty) {
    return createErrorResponse(
      {
        type: ERROR_TYPES.VALIDATION_ERROR,
        message: `${isSessionIdEmpty ? "Session Id" : "Query"} is required`,
      },
      400
    );
  }

  const abortController = new AbortController();
  const { signal } = abortController;
  if (request?.signal) {
    request.signal.addEventListener("abort", () => {
      abortController.abort();
    });
  }

  try {
    return createStreamingResponse(
      async ({ send, close, isClosed }) => {
        try {
          await AgentClient(sessionId, send, signal).executeTaskLoop(message);
        } catch (error) {
          console.error("AI client error:", error);
        } finally {
          if (!isClosed()) close();
        }
      },
      { signal: request?.signal }
    );
  } catch (error) {
    console.error("AI client error:", error);
    return createErrorResponse(
      {
        type: ERROR_TYPES.AI_CLIENT_ERROR,
        message: "Failed to start AI client.",
      },
      500
    );
  }
}
