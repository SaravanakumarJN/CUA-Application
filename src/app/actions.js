"use server";

import { Sandbox } from "@e2b/desktop";

export async function stopSandboxSession(sandboxId) {
  try {
    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.kill();
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}