import OpenAI from "openai";
import { syntheticDelay } from "@/utils/generic.helper";
import { getOpenAiActions } from "../../sandbox/actions";
import { SSEEventType, ERROR_TYPES } from "@/constants";

export function OpenAiClient(sandbox, resolution, sandboxType) {
  const client = new OpenAI();
  const actions = getOpenAiActions(sandboxType)(sandbox);

  async function executeTaskLoop(messages, send, signal) {
    const aiClientDefaultConfig = {
      model: "computer-use-preview",
      instructions:
        sandboxType === "e2b"
          ? `You are a ai assistant that can use a computer to help the user with their tasks. The screenshots that you receive are from a running sandbox instance, allowing you to see and interact with a virtual computer environment in real-time. The virtual computer is based on Ubuntu 22.04, and it has many pre-installed applications. You can execute most commands and operations.`
          : `You are an AI assistant that can use a virtual Android device to help the user with their tasks. The screenshots you receive are from a running Android emulator, allowing you to see and interact with an emulated Android environment in real time. The emulator is based on Android 16, and it supports touch-based input, gestures, typing, launching apps, and interacting with the Android system like a real phone or tablet. 
          IMPORTANT: You’re given a screenshot that is exactly ${
            resolution[0]
          }x${
              resolution[1]
            } pixels. The top-left corner is (0,0), the bottom-right is (${
              resolution[0] - 1
            },${
              resolution[1] - 1
            }). Return the pixel coordinate as seen in this image, counting from the full top left.
          VERY IMPORTANT: There seems to be negative offset in the coordinates for computer call that you generate, so provide percise coordinates for computer call.
          VERY IMPORTANT: You are looking at a mobile screenshot (Android 16, 1080x2400 pixels, NO desktop UI). All coordinates are touch coordinates in this pixel grid. DO NOT perform any mouse-based scaling or window mapping. Top left is (0,0), bottom right is (1079,2399).”
          `,
      truncation: "auto",
      reasoning: { effort: "medium", generate_summary: "concise" },
      tools: [
        {
          type: "computer_use_preview",
          display_width: resolution[0],
          display_height: resolution[1],
          environment: "linux",
        },
      ],
    };

    try {
      send(SSEEventType.TASK_STARTED, {
        message: "Task started",
      });

      let response = await client.responses.create({
        ...aiClientDefaultConfig,
        input: [...messages],
      });

      while (true) {
        if (signal?.aborted) {
          send(SSEEventType.TASK_ABORTED, {
            message: "Task aborted by user",
          });
          break;
        }

        if (!response || !Array.isArray(response.output)) {
          send(SSEEventType.TASK_FAILED, {
            message: "AI model returned an unexpected response format.",
            data: { code: ERROR_TYPES.AI_CLIENT_TASK_ERROR, details: response },
          });
          break;
        }

        const computerCalls = response.output.filter(
          (i) => i.type === "computer_call"
        );

        if (computerCalls.length === 0) {
          send(SSEEventType.TASK_COMPLETED, {
            message: "Task completed successfully",
          });
          send(SSEEventType.TASK_REASONING, {
            message: response.output_text,
          });
          break;
        }

        const call = computerCalls[0];
        const callId = call.call_id;
        const action = call.action;

        const reasoningItems = response.output.filter(
          (i) => i.type === "message" && i.content !== undefined
        );
        if (reasoningItems.length > 0) {
          const content = reasoningItems[0].content;
          const reasoningText =
            content[0].type === "output_text"
              ? content[0].text
              : JSON.stringify(content);
          send(SSEEventType.TASK_REASONING, {
            message: reasoningText,
          });
        }

        send(SSEEventType.TASK_ACTION_STARTED, {
          message: `Starting ${action?.type || "sandbox"} action`,
          data: { action },
        });
        try {
          await executeComputerCallAction(action);
        } catch (error) {
          send(SSEEventType.TASK_FAILED, {
            message: `Failed to execute ${action?.type || "sandbox"} action.`,
            data: {
              code: ERROR_TYPES.SANDBOX_ACTION_ERROR,
              details: String(error?.message || error),
            },
          });
          break;
        }
        send(SSEEventType.TASK_ACTION_COMPLETED, {
          message: `Completed ${action?.type || "sandbox"} action`,
          data: { action },
        });

        await syntheticDelay(3000);
        const screenshotBase64 = await actions.screenshotBase64();

        const output = {
          call_id: callId,
          type: "computer_call_output",
          output: {
            type: "input_image",
            image_url: `data:image/png;base64,${screenshotBase64}`,
          },
        };

        response = await client.responses.create({
          ...aiClientDefaultConfig,
          previous_response_id: response.id,
          input: [output],
        });
      }
    } catch (error) {
      send(SSEEventType.TASK_FAILED, {
        message: "An unexpected error occurred during task execution.",
        data: {
          code: ERROR_TYPES.AI_CLIENT_TASK_ERROR,
          details: String(error?.message || error),
        },
      });
    }
  }

  async function executeComputerCallAction(action) {
    const actionHandler = actions[action.type];
    if (typeof actionHandler !== "function") return;
    await actionHandler(action);
  }

  return { executeTaskLoop };
}
