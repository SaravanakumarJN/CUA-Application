import { getSession } from "@/utils/session";
import { MESSAGE_ROLE, SSEEventType, ERROR_TYPES } from "@/constants";
import { androidEmulatorActions } from "@/utils/sandbox/actions/android-emulator-v1";
import { AnalyserModel } from "@/utils/model/analyser";
import { ReasonerModel } from "@/utils/model/reasoner";
import { GrounderModel } from "@/utils/model/grounder";
import { syntheticDelay } from "@/utils/generic.helper";

export function AgentClient(sessionId, send, signal) {
  const maxIterationsAllowed = 25;
  const session = getSession(sessionId);
  const { getMemory, appendToMemory } = session;
  const {
    actions: sandboxActions,
    actionsToolCallDefinition: sandboxActionToolCallDefinition,
  } = androidEmulatorActions();
  const analyserModel = AnalyserModel();
  const reasonerModel = ReasonerModel();
  const grounderModel = GrounderModel();
  const tools = [
    ...sandboxActionToolCallDefinition,
    {
      type: "function",
      name: "stop",
      description: "Sends message that the task has been completed",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  ];

  async function executeTaskLoop(message) {
    let iteration = 0;
    let done = false;

    try {
      send(SSEEventType.TASK_STARTED, {
        message: "Task started",
      });
      appendToMemory({
        role: MESSAGE_ROLE.USER,
        content: `OBJECTIVE: ${message}`,
      });

      while (!done) {
        iteration += 1;
        if (iteration > maxIterationsAllowed) {
          send(SSEEventType.TASK_FAILED, {
            message: "Maximum iteration limit exceeded",
          });
          break;
        }
        if (signal?.aborted) {
          send(SSEEventType.TASK_ABORTED, {
            message: "Task aborted by user",
          });
          break;
        }

        let messages = getMemory();
        const screenshotBuffer = await sandboxActions.screenshotBuffer();
        const screenshotBase64 = screenshotBuffer.toString("base64");

        const uiElementList = await grounderModel.execute(screenshotBuffer);
        console.log(uiElementList, "grounding model");

        const currentStateAnalysis = await analyserModel.execute(
          messages,
          screenshotBase64
        );
        appendToMemory({
          role: MESSAGE_ROLE.ASSISTANT,
          content: `THOUGHT: ${currentStateAnalysis}

Available UI elements with coordinates:
${uiElementList}`,
        });
        send(SSEEventType.TASK_REASONING, {
          message: currentStateAnalysis,
        });
        console.log(currentStateAnalysis, "analysing model");

        message = getMemory();
        const { reasoningText, toolCalls } = await reasonerModel.execute(
          messages,
          tools
        );
        if (reasoningText) {
          appendToMemory({
            role: MESSAGE_ROLE.ASSISTANT,
            content: `THOUGHT: ${reasoningText}`,
          });
        }
        console.log(reasoningText, toolCalls, "reasoning model");

        done = true;
        for (let i = 0; i < toolCalls.length; i++) {
          let callDetails = toolCalls[i];
          let { name, arguments: args, type } = callDetails;
          if (name == "stop") {
            send(SSEEventType.TASK_COMPLETED, {
              message: "Task completed",
            });
            break;
          }
          done = false;

          appendToMemory({
            role: MESSAGE_ROLE.ASSISTANT,
            content: JSON.stringify(callDetails),
          });
          send(SSEEventType.TASK_ACTION_STARTED, {
            message: `Performing ${name} action`,
            data: { action: { type, name, args: JSON.parse(args) } },
          });
          await sandboxActions[name]?.(JSON.parse(args));
          await syntheticDelay(2000);
          appendToMemory({
            role: MESSAGE_ROLE.ASSISTANT,
            content: `${name} function with args ${args} executed successfully`,
          });
          send(SSEEventType.TASK_ACTION_COMPLETED, {
            message: `Completed ${name} action`,
            data: { action: JSON.stringify(callDetails) },
          });
        }
      }
    } catch (error) {
      console.log("Agent error:", error);
      send(SSEEventType.TASK_FAILED, {
        message: "An unexpected error occurred during task execution.",
        data: {
          code: ERROR_TYPES.AI_CLIENT_TASK_ERROR,
          details: String(error?.message || error),
        },
      });
    }
  }

  return {
    executeTaskLoop,
  };
}
