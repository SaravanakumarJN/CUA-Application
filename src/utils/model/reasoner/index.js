import { MESSAGE_ROLE } from "@/constants";
import OpenAI from "openai";

export function ReasonerModel() {
  const client = new OpenAI();

  async function execute(messages, tools) {
    const reasoningPromptedMessage = [
      {
        role: MESSAGE_ROLE.SYSTEM,
        content: `You are an AI assistant with android mobile use abilities. 
IMPORTANT
- Before typing something, make sure that input is selected`,
      },
      ...messages,
      {
        role: MESSAGE_ROLE.ASSISTANT,
        content:
          "Based on the pervious observation, I will decide on action needed to execute the next step and will now use tool calls to take these actions, or use the stop command if the objective is complete.",
      },
    ];

    let response = await client.responses.create({
      model: "gpt-4o",
      input: [...reasoningPromptedMessage],
      tools,
    });

    const reasoningItems = response.output.filter(
      (i) => i.type === "message" && i.content !== undefined
    );
    const content = reasoningItems[0]?.content || "";
    let reasoningText = "";
    if (content) {
      reasoningText =
        content[0].type === "output_text"
          ? content[0].text
          : JSON.stringify(content);
    }

    const toolCalls = response.output.filter((i) => i.type === "function_call");

    return { reasoningText, toolCalls };
  }

  return { execute };
}

// import { OpenAIModel } from "@/utils/ai-client/openai";

// class ReasonerModel {
//   constructor(apiKey, modelName = "gpt-4o") {
//     this.model = new OpenAIModel(apiKey, modelName);
//   }

//   async reason(objective, parsed_elements, screenshot_data) {
//     try {
//       // Generate UI elements list from parsed_elements
//       const elementsList = this.generateElementsList(parsed_elements);

//       const prompt = `You are a UI automation expert analyzing a mobile app interface.

// User Objective: ${objective}

// Available UI Elements (with their IDs):
// ${elementsList}

// Based on the user objective and available UI elements, respond with a JSON object containing:
// - element_id: The ID of the element to interact with
// - action: One of "tap", "type", "open", or "stop"
// - text: (optional) Text to input if action is "type"

// Example response format:
// {"element_id": "123", "action": "tap"}
// {"element_id": "456", "action": "type", "text": "search query"}
// {"element_id": "", "action": "stop"}

// Choose the most appropriate action to achieve the objective. Use "stop" if the objective is completed or cannot be achieved.`;

//       const response = await this.model.createCompletion({
//         messages: [
//           {
//             role: "system",
//             content:
//               "You are a UI automation expert. Always respond with valid JSON only.",
//           },
//           { role: "user", content: prompt },
//         ],
//         max_tokens: 200,
//         temperature: 0.1,
//       });

//       // Parse and validate JSON response
//       return this.parseResponse(response);
//     } catch (error) {
//       console.error("ReasonerModel error:", error);
//       throw error;
//     }
//   }

//   generateElementsList(parsed_elements) {
//     if (!parsed_elements || !Array.isArray(parsed_elements)) {
//       return "No elements available";
//     }

//     return parsed_elements
//       .map((element, index) => {
//         const id = element.id || index.toString();
//         const type = element.type || "unknown";
//         const text = element.text || element.content_desc || "";
//         const bounds = element.bounds ? `[${element.bounds.join(",")}]` : "";

//         return `ID: ${id}, Type: ${type}, Text: "${text}", Bounds: ${bounds}`;
//       })
//       .join("\n");
//   }

//   parseResponse(response) {
//     try {
//       const content = response.choices?.[0]?.message?.content;
//       if (!content) {
//         throw new Error("No response content");
//       }

//       // Clean the response - remove markdown formatting if present
//       const cleanContent = content.replace(/```json\n?|```/g, "").trim();

//       const parsed = JSON.parse(cleanContent);

//       // Validate required fields
//       if (
//         !parsed.hasOwnProperty("element_id") ||
//         !parsed.hasOwnProperty("action")
//       ) {
//         throw new Error("Missing required fields: element_id or action");
//       }

//       // Validate action values
//       const validActions = ["tap", "type", "open", "stop"];
//       if (!validActions.includes(parsed.action)) {
//         throw new Error(`Invalid action: ${parsed.action}`);
//       }

//       return {
//         element_id: parsed.element_id,
//         action: parsed.action,
//         text: parsed.text || null,
//       };
//     } catch (error) {
//       console.error("Failed to parse reasoner response:", error);
//       // Fallback to stop action
//       return {
//         element_id: "",
//         action: "stop",
//         text: null,
//       };
//     }
//   }
// }

// export { ReasonerModel };
