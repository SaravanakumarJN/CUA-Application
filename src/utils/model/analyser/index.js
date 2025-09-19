import { MESSAGE_ROLE } from "@/constants";
import OpenAI from "openai";

export function AnalyserModel() {
  const client = new OpenAI();

  async function execute(messages, screenshotBase64) {
    const analysisPromptedMessage = [
      ...messages,
      {
        role: MESSAGE_ROLE.USER,
        content: [
          {
            type: "input_text",
            text: `This image shows the current display of the android mobile screen. Please respond in the following format
The objective is: [put the objective here]
On the screen, I see: [an extensive list of everything that might be relevant to the objective including, icons, menus, apps, UI elements, and possible android naviagtions and user interactions]
This means the objective is: [complete|not complete]
(Only continue if the objective is not complete.)
The next step is to [tap|type|open] [put the next single step here] in order to [put what you expect to happen here].`,
          },
          {
            type: "input_image",
            image_url: `data:image/png;base64,${screenshotBase64}`,
          },
        ],
      },
    ];

    let response = await client.responses.create({
      model: "gpt-4o",
      input: [...analysisPromptedMessage],
    });

    const reasoningItems = response.output.filter(
      (i) => i.type === "message" && i.content !== undefined
    );
    const content = reasoningItems[0].content;
    const reasoningText =
      content[0].type === "output_text"
        ? content[0].text
        : JSON.stringify(content);

    return reasoningText;
  }

  return { execute };
}
