import { OpenAiClient } from "@/utils/ai-client/openai";
import { E2bSandboxClient } from "@/utils/sandbox/e2b";
import { createStreamingResponse } from "@/utils/sse.helper";
import { sleep } from "@/utils/generic.helper";
import { createErrorResponse } from "@/utils/http.helper";
import { ERROR_TYPES, SSEEventType } from "@/constants";

export async function POST(request) {
  const body = await request.json();
  const { messages, sandboxId, resolution } = body || {};

  const abortController = new AbortController();
  const { signal } = abortController;
  if (request?.signal) {
    request.signal.addEventListener("abort", () => {
      abortController.abort();
    });
  }

  let sandbox, sandboxDetails;
  try {
    const sandboxClient = getSandboxClient(sandboxId, resolution);
    const sandboxInstance = await sandboxClient.getSandbox();
    sandbox = sandboxInstance.sandbox;
    sandboxDetails = sandboxInstance.sandboxDetails;
  } catch (err) {
    console.error("Sandbox error:", err);
    return createErrorResponse(
      {
        type: ERROR_TYPES.SANDBOX_ERROR,
        message: "Failed to initialize sandbox environment.",
      },
      500
    );
  }

  try {
    const aiClient = getAiClient(sandbox, resolution);

    return createStreamingResponse(
      async ({ send, close, isClosed }) => {
        try {
          if (sandboxDetails) {
            send(SSEEventType.SANDBOX_CREATED, {
              message: "Sandbox environment created successfully",
              data: sandboxDetails,
            });
            await sleep(3000);
          }
          await aiClient.executeTaskLoop(messages, send, signal);
        } catch (err) {
          console.error("AI client error:", err);
        } finally {
          if (!isClosed()) close();
        }
      },
      { signal: request?.signal }
    );
  } catch (err) {
    console.error("AI client error:", err);
    return createErrorResponse(
      {
        type: ERROR_TYPES.AI_CLIENT_ERROR,
        message: "Failed to start AI client.",
      },
      500
    );
  }
}

function getAiClient(sandbox, resolution) {
  return OpenAiClient(sandbox, resolution);
}

function getSandboxClient(sandboxId, resolution) {
  return E2bSandboxClient(sandboxId, resolution);
}
