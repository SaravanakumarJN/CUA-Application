const { Sandbox } = await import("@e2b/desktop");
import { createErrorResponse, createSuccessResponse } from "@/utils/http.helper";
import { ERROR_TYPES } from "@/constants";

export async function POST(request) {
  try {
    const { sandboxId } = await request.json();
    if (!sandboxId) {
      return createErrorResponse({ type: ERROR_TYPES.VALIDATION_ERROR, message: "Sandbox ID is required to stop the session" }, 400);
    }

    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.kill();

    return createSuccessResponse({ message: "Sandbox stopped successfully" });
  } catch (error) {
    console.error(error);
    return createErrorResponse({ type: ERROR_TYPES.SANDBOX_ERROR, message: "Unable to stop sandbox session." }, 500);
  }
}


