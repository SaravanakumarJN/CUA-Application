export function createErrorResponse(error, status = 500) {
  let type = "error";
  let message = "";

  if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    type = error.type || "error";
    message = error.message || "";
  } else {
    message = "An error occurred";
  }

  return Response.json(
    { success: false, type, message },
    { status }
  );
}

export function createSuccessResponse(payload = {}, status = 200) {
  return Response.json(
    { success: true, ...payload },
    { status }
  );
}


