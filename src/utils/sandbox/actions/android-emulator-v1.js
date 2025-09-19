import { syntheticDelay } from "@/utils/generic.helper";
import { execAsync, saveScreenshot, spawnAsync } from "@/utils/node.helper";

const ADB_PATH = process.env.ADB_PATH;

export function androidEmulatorActions() {
  return {
    actions: {
      async type(action) {
        let text = action.text.replace(/ /g, "%s");
        await execAsync(`${ADB_PATH} shell input text '${text}'`);
      },

      async tap(action) {
        const { x, y } = action;
        await execAsync(`${ADB_PATH} shell input tap ${x} ${y}`);
      },

      async double_tap(action) {
        const { x, y } = action;

        await execAsync(`${ADB_PATH} shell input tap ${x} ${y}`);
        await execAsync(`${ADB_PATH} shell input tap ${x} ${y}`);
      },

      async scroll(action) {
        const { x: x1, y: y1, scroll_x, scroll_y } = action;

        const x2 = x1 + scroll_x;
        const y2 = y1 + scroll_y;
        const duration = 350;
        await execAsync(
          `${ADB_PATH} shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`
        );
      },

      async key_press(action) {
        await execAsync(`${ADB_PATH} shell input keyevent ${action.keys}`);
      },

      async drag(action) {
        const { x: x1, y: y1 } = action.path[0];
        const { x: x2, y: y2 } = action.path[1];

        await execAsync(
          `${ADB_PATH} shell input swipe ${x1} ${y1} ${x2} ${y2} 500`
        );
      },

      async long_press(action) {
        const { x, y, duration = 1000 } = action;

        await execAsync(
          `${ADB_PATH} shell input swipe ${x} ${y} ${x} ${y} ${duration}`
        );
      },

      async go_back() {
        await execAsync(`${ADB_PATH} shell input keyevent 4`);
      },

      async go_to_homeScreen() {
        await execAsync(`${ADB_PATH} shell input keyevent 3`);
      },

      async go_to_AppMenu() {
        await execAsync(`${ADB_PATH} shell input keyevent 3`);
        await syntheticDelay(1500);

        const output = await execAsync(`${ADB_PATH} shell wm size`);
        const match = output.match(/Physical size:\s*(\d+)x(\d+)/);

        if (!match) throw new Error("Could not determine screen resolution");

        const width = parseInt(match[1], 10);
        const height = parseInt(match[2], 10);

        const x = Math.floor(width / 2);
        const y1 = Math.floor(height * 0.85);
        const y2 = Math.floor(height * 0.4);
        const duration = 350;

        await execAsync(
          `${ADB_PATH} shell input swipe ${x} ${y1} ${x} ${y2} ${duration}`
        );
      },

      async wait() {
        await syntheticDelay(5000);
      },

      async screenshotBuffer() {
        const { stdout: screenshotBuffer } = await spawnAsync(ADB_PATH, [
          "exec-out",
          "screencap",
          "-p",
        ]);
        // saveScreenshot(screenshotBuffer);
        return screenshotBuffer;
      },
    },
    actionsToolCallDefinition: [
      {
        type: "function",
        name: "type",
        description:
          "Type the given text into the current input field on the device.",
        parameters: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description:
                "The text to type. Spaces are typed as %s between words.",
            },
          },
          required: ["text"],
        },
      },
      {
        type: "function",
        name: "tap",
        description:
          "Tap (single click) at the specified coordinates on the screen.",
        parameters: {
          type: "object",
          properties: {
            x: {
              type: "integer",
              description: "Horizontal screen coordinate (pixels)",
            },
            y: {
              type: "integer",
              description: "Vertical screen coordinate (pixels)",
            },
          },
          required: ["x", "y"],
        },
      },
      {
        type: "function",
        name: "double_tap",
        description: "Double tap at the specified coordinates on the screen.",
        parameters: {
          type: "object",
          properties: {
            x: {
              type: "integer",
              description: "Horizontal screen coordinate (pixels)",
            },
            y: {
              type: "integer",
              description: "Vertical screen coordinate (pixels)",
            },
          },
          required: ["x", "y"],
        },
      },
      {
        type: "function",
        name: "scroll",
        description: "Scroll from a given coordinate by a delta x and delta y.",
        parameters: {
          type: "object",
          properties: {
            x: { type: "integer", description: "Start X coordinate" },
            y: { type: "integer", description: "Start Y coordinate" },
            scroll_x: {
              type: "integer",
              description:
                "How many pixels to scroll horizontally (positive right, negative left)",
            },
            scroll_y: {
              type: "integer",
              description:
                "How many pixels to scroll vertically (positive down, negative up)",
            },
          },
          required: ["x", "y", "scroll_x", "scroll_y"],
        },
      },
      {
        type: "function",
        name: "key_press",
        description: "Press a hardware key by Android key code.",
        parameters: {
          type: "object",
          properties: {
            keys: {
              type: "integer",
              description: "The Android key event code to press",
            },
          },
          required: ["keys"],
        },
      },
      {
        type: "function",
        name: "drag",
        description: "Swipe/drag from one screen location to another.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "array",
              description:
                "An array of two points: [{x: startX, y: startY}, {x: endX, y: endY}]. Example: path: [{x:100,y:600}, {x:400,y:600}]",
              items: {
                type: "object",
                properties: {
                  x: { type: "integer", description: "X coordinate" },
                  y: { type: "integer", description: "Y coordinate" },
                },
                required: ["x", "y"],
              },
              minItems: 2,
              maxItems: 2,
            },
          },
          required: ["path"],
        },
      },
      {
        type: "function",
        name: "long_press",
        description:
          "Long-press (touch and hold) at a coordinate for specified duration.",
        parameters: {
          type: "object",
          properties: {
            x: { type: "integer", description: "X coordinate to long press" },
            y: { type: "integer", description: "Y coordinate to long press" },
            duration: {
              type: "integer",
              description:
                "Duration of long press in milliseconds (default 1000 ms)",
              default: 1000,
            },
          },
          required: ["x", "y"],
        },
      },
      {
        type: "function",
        name: "go_back",
        description: "Simulate the Android back button (key 4, 'Back').",
        parameters: {
          type: "object",
          properties: {},
        },
      },
      // {
      //   type: "function",
      //   name: "go_to_homeScreen",
      //   description: "Simulate the Android home button (key 3, 'Home').",
      //   parameters: {
      //     type: "object",
      //     properties: {},
      //   },
      // },
      // {
      //   type: "function",
      //   name: "go_to_AppMenu",
      //   description:
      //     "Navigate to the home screen, then swipe up to open the app drawer.",
      //   parameters: {
      //     type: "object",
      //     properties: {},
      //   },
      // },
      {
        type: "function",
        name: "wait",
        description:
          "Pause/wait for 5 seconds to allow screen transitions or async events.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
}
