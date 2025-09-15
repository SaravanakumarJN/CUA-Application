import { syntheticDelay } from "@/utils/generic.helper";
import { execAsync, saveScreenshot, spawnAsync } from "@/utils/node.helper";

const ADB_PATH = process.env.ADB_PATH;

export function androidEmulatorActions() {
  return {
    async type(action) {
      let text = action.text.replace(/ /g, "%s");
      await execAsync(`${ADB_PATH} shell input text '${text}'`);
    },

    async click(action) {
      const { x, y } = action;
      await execAsync(`${ADB_PATH} shell input tap ${x} ${y}`);
    },

    async double_click(action) {
      const { x, y } = action;

      await execAsync(`${ADB_PATH} shell input tap ${x} ${y}`);
      await execAsync(`${ADB_PATH} shell input tap ${x} ${y}`);
    },

    async scroll(action) {
      const { x: x1, y: y1, scroll_x, scroll_y } = action;

      const x2 = x1 + scroll_x;
      const y2 = y1 + scroll_y;
      const duration = 300;
      await execAsync(
        `${ADB_PATH} shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`
      );
    },

    async keypress(action) {
      await execAsync(`${ADB_PATH} shell input keyevent ${action.keys}`);
    },

    async move(action) {
      return;
    },

    async drag(action) {
      const { x: x1, y: y1 } = action.path[0];
      const { x: x2, y: y2 } = action.path[1];

      await execAsync(
        `${ADB_PATH} shell input swipe ${x1} ${y1} ${x2} ${y2} 500`
      );
    },

    async wait() {
      await syntheticDelay(5000);
    },

    async screenshotBase64() {
      const { stdout: screenshotBuffer } = await spawnAsync(ADB_PATH, [
        "exec-out",
        "screencap",
        "-p",
      ]);
      // saveScreenshot(screenshotBuffer);
      const screenshotBase64 = screenshotBuffer.toString("base64");
      return screenshotBase64;
    },
  };
}
