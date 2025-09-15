import { e2bActions } from "./e2b";
import { androidEmulatorActions } from "./android-emulator";

const openAiActions = {
  e2b: e2bActions,
  androidEmulator: androidEmulatorActions,
};

export function getOpenAiActions(sandboxType) {
  return openAiActions[sandboxType] || {};
}
