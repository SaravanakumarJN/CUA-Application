import { Sandbox } from "@e2b/desktop";
import { OpenAiClient } from "@/utils/ai-client/openai";
import { createStreamingResponse } from "@/utils/sse.helper";
import { SSEEventType } from "@/constants";
import { sleep } from "@/utils/generic.helper";

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

  let sandbox, sandboxCreationEvent;
  try {
    const sandboxResult = await getSandbox(sandboxId, resolution);
    sandbox = sandboxResult.sandbox;
    sandboxCreationEvent = sandboxResult.sandboxCreationEvent;
  } catch (err) {
    console.error("Sandbox error:", err);
    return errorResponse("sandbox_error", "Error in sandbox operation.", 500);
  }

  let aiClient;
  try {
    aiClient = getAiClient(sandbox, resolution);

    return createStreamingResponse(async ({ send: sendSSE, close }) => {
      if (sandboxCreationEvent) {
        sendSSE(sandboxCreationEvent);
        sleep(3000);
      }
      await aiClient.executeTaskLoop(messages, sendSSE, signal);
      close();
    });
  } catch (err) {
    console.error("AI client error:", err);
    return errorResponse(
      "ai_client_error",
      "Error in AI client operation.",
      500
    );
  }
}

function errorResponse(type, message, status) {
  return new Response(JSON.stringify({ type, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getAiClient(sandbox, resolution) {
  return OpenAiClient(sandbox, resolution);
}

async function getSandbox(sandboxId, resolution) {
  let sandbox, sandboxStreamUrl, created;
  if (!sandboxId) {
    sandbox = await Sandbox.create({
      resolution,
      dpi: 96,
      timeoutMs: 1200000
    });
    await sandbox.stream.start();
    sandboxStreamUrl = sandbox.stream.getUrl();
    sandboxId = sandbox.sandboxId;
    created = true;
  } else {
    sandbox = await Sandbox.connect(sandboxId);
    created = false;
  }

  const sandboxCreationEvent =
    created && sandboxId && sandboxStreamUrl
      ? {
          type: SSEEventType.SANDBOX_CREATED,
          sandboxId,
          sandboxStreamUrl,
        }
      : null;

  return {
    sandbox,
    sandboxId,
    sandboxStreamUrl,
    sandboxCreationEvent,
  };
}
