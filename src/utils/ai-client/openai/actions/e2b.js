import { syntheticDelay } from "@/utils/generic.helper";

export function e2bActions(sandbox) {
  return {
    async type(action) {
      await sandbox.write(action.text);
    },

    async click(action) {
      const { x, y } = action;
      if (action.button === "left") await sandbox.leftClick(x, y);
      else if (action.button === "right") await sandbox.rightClick(x, y);
      else if (action.button === "wheel") await sandbox.middleClick(x, y);
    },

    async double_click(action) {
      const { x, y } = action;
      await sandbox.doubleClick(x, y);
    },

    async scroll(action) {
      if (action.scroll_y < 0)
        await sandbox.scroll("up", Math.abs(action.scroll_y));
      else if (action.scroll_y > 0)
        await sandbox.scroll("down", action.scroll_y);
    },

    async keypress(action) {
      await sandbox.press(action.keys);
    },

    async move(action) {
      const { x, y } = action;
      await sandbox.moveMouse(x, y);
    },

    async drag(action) {
      const end = [action.path[1].x, action.path[1].y];
      const start = [action.path[0].x, action.path[0].y];
      await sandbox.drag(start, end);
    },

    async wait() {
      await syntheticDelay(5000);
    },

    async screenshotBase64() {
      const screenshot = await sandbox.screenshot();
      const screenshotBase64 = Buffer.from(screenshot).toString("base64");
      return screenshotBase64;
    },
  };
}
