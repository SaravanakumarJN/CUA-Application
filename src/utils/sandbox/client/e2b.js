import { Sandbox } from "@e2b/desktop";

export function E2bSandboxClient(sandboxId, resolution) {
  async function createSandbox() {
    const sandboxInstance = await Sandbox.create({
      resolution,
      dpi: 96,
      timeoutMs: 3_600_000, // 1 hour
      requestTimeoutMs: 300_000, // 5 mins
    });

    await sandboxInstance.stream.start();
    const sandboxStreamUrl = sandboxInstance.stream.getUrl();
    const sandboxId = sandboxInstance.sandboxId;

    return {
      sandboxInstance,
      sandboxId,
      sandboxStreamUrl,
      created: true,
    };
  }

  async function connectSandbox() {
    const sandboxInstance = await Sandbox.connect(sandboxId);

    return {
      sandboxInstance,
      sandboxId,
      sandboxStreamUrl: null,
      created: false,
    };
  }

  async function getSandbox() {
    let sandbox;

    if (!sandboxId) {
      sandbox = await createSandbox(resolution);
    } else {
      sandbox = await connectSandbox(sandboxId);
    }

    const sandboxDetails =
      sandbox.created && sandbox.sandboxId && sandbox.sandboxStreamUrl
        ? {
            sandboxId: sandbox.sandboxId,
            sandboxStreamUrl: sandbox.sandboxStreamUrl,
          }
        : null;

    return {
      sandbox: sandbox.sandboxInstance,
      sandboxDetails,
    };
  }

  return {
    getSandbox,
  };
}
