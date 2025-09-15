import { OpenAiClient } from "@/utils/ai-client/openai/openai";
import { E2bSandboxClient } from "@/utils/sandbox/e2b";
import { createStreamingResponse } from "@/utils/sse.helper";
import { syntheticDelay } from "@/utils/generic.helper";
import { createErrorResponse } from "@/utils/http.helper";
import { ERROR_TYPES, SSEEventType } from "@/constants";
import { AndroidEmulatorSandboxClient } from "@/utils/sandbox/android-emulator";

// const SANDBOX_TYPE = 'e2b'
const SANDBOX_TYPE = "androidEmulator";

export async function POST(request) {
  const body = await request.json();
  let { messages, sandboxId, resolution } = body || {};
  resolution = SANDBOX_TYPE === "androidEmulator" ? [1080, 2400] : resolution;

  const abortController = new AbortController();
  const { signal } = abortController;
  if (request?.signal) {
    request.signal.addEventListener("abort", () => {
      abortController.abort();
    });
  }

  let sandbox, sandboxDetails;
  try {
    const sandboxClient = getSandboxClient(sandboxId, resolution, SANDBOX_TYPE);
    const sandboxInstance = await sandboxClient.getSandbox();
    sandbox = sandboxInstance.sandbox;
    sandboxDetails = sandboxInstance.sandboxDetails;
  } catch (error) {
    console.error("Sandbox error:", error);
    return createErrorResponse(
      {
        type: ERROR_TYPES.SANDBOX_ERROR,
        message: "Failed to initialize sandbox environment.",
      },
      500
    );
  }

  try {
    const aiClient = getAiClient(sandbox, resolution, SANDBOX_TYPE);

    return createStreamingResponse(
      async ({ send, close, isClosed }) => {
        try {
          if (sandboxDetails) {
            send(SSEEventType.SANDBOX_CREATED, {
              message: "Sandbox environment created successfully",
              data: sandboxDetails,
            });
            await syntheticDelay(3000);
          }
          await aiClient.executeTaskLoop(messages, send, signal);
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

function getAiClient(sandbox, resolution, sandboxType) {
  return OpenAiClient(sandbox, resolution, sandboxType);
}

function getSandboxClient(sandboxId, resolution, sandboxType) {
  switch (sandboxType) {
    case "e2b":
      return E2bSandboxClient(sandboxId, resolution);
    case "androidEmulator":
      return AndroidEmulatorSandboxClient();
    default:
      throw new Error("Invalid sandbox type");
  }
}
