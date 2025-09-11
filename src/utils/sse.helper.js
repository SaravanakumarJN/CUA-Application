export function formatSSE(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function parseSSE(event) {
  try {
    if (!event || event.trim() === "") return null;
    if (event.startsWith("data: ")) {
      const jsonStr = event.substring(6).trim();
      if (!jsonStr) return null;
      return JSON.parse(jsonStr);
    }
    const match = event.match(/data: ({.*})/);
    if (match && match[1]) return JSON.parse(match[1]);
    return JSON.parse(event);
  } catch (error) {
    console.log(error);
    return null;
  }
}

export function sendSSE(streamController, event) {
  const data = new TextEncoder().encode(formatSSE(event));
  streamController.enqueue(data);
}

export function makeSSEStream(startFn) {
  return new ReadableStream({
    start(controller) {
      return startFn({
        send: (event) => sendSSE(controller, event),
        close: () => controller.close(),
      });
    },
    cancel() {},
  });
}

export function createStreamingResponse(fn) {
  const stream = makeSSEStream(fn);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
