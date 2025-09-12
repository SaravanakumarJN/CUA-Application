import OpenAI from "openai";
import { sleep } from "../generic.helper";
import { SSEEventType } from "@/constants";

const computerUseAgentDefaultConfig = {
  model: "computer-use-preview",
  instructions: `You are a ai assistant that can use a computer to help the user with their tasks. The screenshots that you receive are from a running sandbox instance, allowing you to see and interact with a real virtual computer environment in real-time. The virtual computer is based on Ubuntu 22.04, and it has many pre-installed applications. You can execute most commands and operations.`,
  truncation: "auto",
  reasoning: { effort: "medium", generate_summary: "concise" },
};

export function OpenAiClient(sandbox, resolution) {
  const client = new OpenAI();

  async function executeTaskLoop(messages, sendSSE, signal) {
    try {
      const [width, height] = resolution;

      const tool = {
        type: "computer_use_preview",
        display_width: width,
        display_height: height,
        environment: "linux",
      };

      let response = await client.responses.create({
        ...computerUseAgentDefaultConfig,
        tools: [tool],
        input: [...messages],
      });

      while (true) {
        if (signal?.aborted) {
          sendSSE({
            type: SSEEventType.TASK_COMPLETED,
            content: "Stopped by user",
          });
          break;
        }

        const computerCalls = response.output.filter(
          (i) => i.type === "computer_call"
        );

        if (computerCalls.length === 0) {
          sendSSE({ type: SSEEventType.TASK_COMPLETED });
          sendSSE({
            type: SSEEventType.REASONING,
            content: response.output_text,
          });
          break;
        }

        const call = computerCalls[0];
        const callId = call.call_id;
        const action = call.action;

        const reasoningItems = response.output.filter(
          (i) => i.type === "message" && "content" in i
        );
        if (reasoningItems.length > 0 && "content" in reasoningItems[0]) {
          const content = reasoningItems[0].content;
          sendSSE({
            type: SSEEventType.REASONING,
            content:
              content[0].type === "output_text"
                ? content[0].text
                : JSON.stringify(content),
          });
        }

        sendSSE({ type: SSEEventType.ACTION_STARTED, action });
        await executeComputerCallAction(action);
        sendSSE({ type: SSEEventType.ACTION_COMPLETED, action });

        await sleep(3000);
        const screenshot = await sandbox.screenshot();
        const base64 = Buffer.from(screenshot).toString("base64");

        const output = {
          call_id: callId,
          type: "computer_call_output",
          output: {
            type: "input_image",
            image_url: `data:image/png;base64,${base64}`,
          },
        };

        response = await client.responses.create({
          ...computerUseAgentDefaultConfig,
          previous_response_id: response.id,
          tools: [tool],
          input: [output],
        });
      }
    } catch (error) {
      console.log(error);
      sendSSE({
        type: "error",
        content: "An error occured. Please try again.",
      });
    }
  }

  async function executeComputerCallAction(action) {
    switch (action.type) {
      case "type":
        await sandbox.write(action.text);
        break;
      case "click": {
        const { x, y } = action;
        if (action.button === "left") await sandbox.leftClick(x, y);
        else if (action.button === "right") await sandbox.rightClick(x, y);
        else if (action.button === "wheel") await sandbox.middleClick(x, y);
        break;
      }
      case "double_click": {
        const { x, y } = action;
        await sandbox.doubleClick(x, y);
        break;
      }
      case "scroll":
        if (action.scroll_y < 0)
          await sandbox.scroll("up", Math.abs(action.scroll_y));
        else if (action.scroll_y > 0)
          await sandbox.scroll("down", action.scroll_y);
        break;
      case "keypress":
        await sandbox.press(action.keys);
        break;
      case "move": {
        const { x, y } = action;
        await sandbox.moveMouse(x, y);
        break;
      }
      case "drag": {
        const end = [action.path[1].x, action.path[1].y];
        const start = [action.path[0].x, action.path[0].y];
        await sandbox.drag(start, end);
        break;
      }
      case "wait": {
        await sleep(5000);
        break;
      }
      default:
        break;
    }
  }

  return { executeTaskLoop };
}
