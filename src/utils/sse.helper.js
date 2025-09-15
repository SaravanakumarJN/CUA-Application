function safeJsonStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return JSON.stringify({ error: "[unserializable]" });
  }
}

export function formatSSE(event, options = {}) {
  const { eventName } = options;
  const lines = [];
  if (eventName) lines.push(`event: ${String(eventName)}`);
  lines.push(`data: ${safeJsonStringify(event)}`);
  return lines.join("\n") + "\n\n";
}

export function parseSSE(raw) {
  try {
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const dataLine = trimmed
      .split("\n")
      .find((line) => line.startsWith("data: "));
    if (!dataLine) return null;
    const jsonStr = dataLine.slice(6).trim();
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.log(error);
    return null;
  }
}

export function createSSEStream(onStart, options = {}) {
  const { signal } = options;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function enqueueChunk(text) {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch (_) {}
      }

      function send(type, options = {}) {
        if (isClosed) return;

        const { message, data } = options;
        const event = {
          type,
          timestamp: Date.now(),
          ...(message && { message }),
          ...(data && { data }),
        };

        enqueueChunk(formatSSE(event));
      }

      function close() {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch (_) {}
      }

      function error(error) {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.error(error);
        } catch (_) {}
      }

      if (signal) {
        if (signal.aborted) {
          close();
        } else {
          signal.addEventListener("abort", close, { once: true });
        }
      }

      return onStart({ send, close, error, isClosed: () => isClosed });
    },
    cancel() {
      isClosed = true;
    },
  });

  return stream;
}

export function createStreamingResponse(onStart, options = {}) {
  const stream = createSSEStream(onStart, options);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
