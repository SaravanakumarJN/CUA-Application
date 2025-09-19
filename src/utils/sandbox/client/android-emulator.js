import {
  isEmulatorRunning,
  startEmulator,
  waitForAdbDevice,
  waitForBoot,
} from "../../android-emulator.helper";

const AVD_NAME = process.env.AVD_NAME;
const EMULATOR_PATH = process.env.EMULATOR_PATH;
const ADB_PATH = process.env.ADB_PATH;

export function AndroidEmulatorSandboxClient() {
  async function createSandbox() {
    const isRunning = await isEmulatorRunning(ADB_PATH);

    if (!isRunning) {
      await startEmulator(EMULATOR_PATH, AVD_NAME);
      await waitForAdbDevice(ADB_PATH);
      await waitForBoot(ADB_PATH);
    }

    return {
      created: !isRunning,
    };
  }

  async function getSandbox() {
    let sandbox = await createSandbox();
    const sandboxDetails = sandbox.created ? {} : null;

    return {
      sandbox: {},
      sandboxDetails,
    };
  }

  return {
    getSandbox,
  };
}
