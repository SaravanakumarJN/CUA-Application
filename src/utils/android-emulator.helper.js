import { execAsync, backgroundSpawnAsync } from "@/utils/node.helper";
import { syntheticDelay } from "@/utils/generic.helper";

export async function isEmulatorRunning(adbPath) {
  const output = await execAsync(`${adbPath} devices`);
  return /emulator-\d+\s+device/.test(output);
}

export async function startEmulator(emulatorPath, avdName) {
  await backgroundSpawnAsync(emulatorPath, [
    "-avd",
    avdName,
    "-netdelay",
    "none",
    "-netspeed",
    "full",
  ]);
}

export async function waitForAdbDevice(adbPath) {
  await execAsync(`${adbPath} wait-for-device`);
}

export async function waitForBoot(adbPath) {
  while (true) {
    const output = await execAsync(
      `${adbPath} shell getprop sys.boot_completed`
    );
    if (output.trim() === "1") {
      break;
    }
    await syntheticDelay(1000);
  }
}
