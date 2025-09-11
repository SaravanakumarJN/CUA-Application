import { Sandbox } from "@e2b/desktop";
import { OpenAiClient } from "@/utils/ai-client/openai";
import { createStreamingResponse } from "@/utils/sse.helper";
import { SSEEventType } from "@/constants";
import { resolutionUtils } from "@/utils/resolution.helper";
import { sleep } from "@/utils/generic.helper";

export async function POST(request) {
  const abortController = new AbortController();
  const { signal } = abortController;

  request.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  const { messages, sandboxId, resolution } = await request.json();

  try {
    const { sandbox, sandboxCreationEvent } = await getSandbox(
      sandboxId,
      resolution
    );
    const aiClient = getAiClient(sandbox, resolution);

    return createStreamingResponse(async ({ send: sendSSE, close }) => {
      if (sandboxCreationEvent) {
        sendSSE(sandboxCreationEvent);
        sleep(3000);
      }
      await aiClient.run(messages, sendSSE, signal);
      close();
    });
  } catch (error) {
    console.log(error);
    return new Response("An error occurred. Please try again.", {
      status: 500,
    });
  }
}

function getAiClient(sandbox, resolution) {
  // resolution = resolutionUtils(resolution);
  return OpenAiClient(sandbox, resolution);
}

async function getSandbox(sandboxId, resolution) {
  let sandbox, sandboxStreamUrl, created;
  if (!sandboxId) {
    sandbox = await Sandbox.create({
      resolution,
      dpi: 96,
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
