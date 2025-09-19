import {
  createErrorResponse,
  createSuccessResponse,
} from "@/utils/http.helper";
import { ERROR_TYPES } from "@/constants";
import { createSession } from "@/utils/session";
import { AndroidEmulatorSandboxClient } from "@/utils/sandbox/client/android-emulator";

export async function POST() {
  try {
    const sandboxClient = AndroidEmulatorSandboxClient();
    await sandboxClient.getSandbox();

    const sessionId = createSession();

    return createSuccessResponse({
      message: "Session started successfully",
      sessionId,
    });
  } catch (error) {
    console.error(`Session error: ${error}`);
    return createErrorResponse(
      {
        type: ERROR_TYPES.SESSION_ERROR,
        message: "Unable to start session.",
      },
      500
    );
  }
}