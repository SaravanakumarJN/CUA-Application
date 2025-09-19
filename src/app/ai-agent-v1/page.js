"use client";

import { useRef, useState, useEffect } from "react";
import { SSEEventType, MESSAGE_ROLE } from "@/constants";
import { parseSSE } from "@/utils/sse.helper";
import { ToastContainer, toast } from "react-toastify";

export default function Home() {
  const [sessionId, setSessionId] = useState(null);
  const [sandboxId, setSandboxId] = useState(null);
  const [sandboxStreamUrl, setSandboxStreamUrl] = useState(null);
  const sandboxStreamContainerRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  function handleInputChange(e) {
    setInput(e.target.value);
  }

  function handleOnSandboxCreated(newSandboxId, newSandboxStreamUrl) {
    setSandboxId(newSandboxId);
    setSandboxStreamUrl(newSandboxStreamUrl);
  }

  async function handleCreateSession() {
    try {
      const res = await fetch("/api/ai-agent-v1/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Error in creating session");
      const data = await res.json();
      if (data?.success) {
        setSessionId(data.sessionId);
      } else {
        throw new Error("Error in stopping sandbox session");
      }
    } catch (error) {
      console.log(error);
    }
  }

  function handleSend() {
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");

    if (content) {
      const resolution = [
        sandboxStreamContainerRef.current?.clientWidth,
        sandboxStreamContainerRef.current?.clientHeight,
      ];

      handleRunTask({
        content,
        sessionId,
      });
    }
  }

  async function handleRunTask({ content, sessionId }) {
    if (isLoading) return;

    setIsLoading(true);

    const userMessage = {
      role: MESSAGE_ROLE.USER,
      content,
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai-agent-v1/use-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          sessionId: sessionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Error in sending message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Error in sending message");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            const parsedEvent = parseSSE(buffer);
            handleSSE(parsedEvent);
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          if (!event.trim()) continue;
          const parsedEvent = parseSSE(event);
          if (!parsedEvent) continue;
          handleSSE(parsedEvent);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  function handleStopTask() {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
        setIsLoading(false);
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      }
    }
  }

  function handleSSE(event) {
    switch (event.type) {
      case SSEEventType.TASK_STARTED: {
        const message = event.message || "Task started";
        toast(message);
        addSystemMessage(setMessages, message);
        break;
      }
      case SSEEventType.TASK_COMPLETED: {
        const message = event.message || "Task finished";
        toast(message);
        addSystemMessage(setMessages, message);
        setIsLoading(false);
        break;
      }
      case SSEEventType.TASK_FAILED: {
        const message = event.message || "Task failed";
        const code = event.data?.code ? ` (${event.data.code})` : "";
        const details = event.data?.details ? ` - ${event.data.details}` : "";
        toast(`${message} ${code} ${details}`);
        addSystemMessage(setMessages, `${message}${code}${details}`);
        setIsLoading(false);
        break;
      }
      case SSEEventType.TASK_ABORTED: {
        const message = event.message || "Task aborted";
        toast(message);
        addSystemMessage(setMessages, message);
        setIsLoading(false);
        break;
      }
      case SSEEventType.TASK_ACTION_STARTED: {
        const action = event.data?.action;
        if (action) addAssistantTaskActionMessage(setMessages, action);
        break;
      }
      case SSEEventType.TASK_ACTION_COMPLETED: {
        const action = event.data?.action;
        updateLastAssistantTaskActionMessage(setMessages, "completed");
        break;
      }
      case SSEEventType.TASK_REASONING: {
        const message = event.message || "";
        if (typeof message === "string") {
          addAssistantMessage(setMessages, message);
        }
        break;
      }
      case SSEEventType.SANDBOX_CREATED: {
        const { sandboxId, sandboxStreamUrl } = event.data || {};
        if (sandboxId && sandboxStreamUrl) {
          handleOnSandboxCreated(sandboxId, sandboxStreamUrl);
        }
        break;
      }
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    handleCreateSession();

    return () => {
      try {
        handleStopSandboxSession();
        if (abortControllerRef.current) abortControllerRef.current.abort();
      } catch (_) {}
    };
  }, []);

  return (
    <>
      <ToastContainer />
      <div className="flex w-full h-screen bg-gray-50">
        <div className="flex flex-col w-full h-full border-r border-gray-200 bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`px-2 py-1 ${
                  msg.role === MESSAGE_ROLE.USER
                    ? "ml-auto bg-blue-500 text-white max-w-lg w-fit my-2"
                    : msg.role === MESSAGE_ROLE.ASSISTANT
                    ? "mr-auto bg-gray-200 text-gray-900 max-w-lg w-fit my-2"
                    : "bg-gray-50 w-full text-sm"
                }`}
              >
                {msg.role === MESSAGE_ROLE.USER ||
                msg.role === MESSAGE_ROLE.ASSISTANT ? (
                  msg.content
                ) : msg.role === MESSAGE_ROLE.ASSISTANT_TASK_ACTION ? (
                  <pre>
                    {msg.status === "completed" ? "🟢" : "🟠"} Action{" "}
                    {JSON.stringify(msg.action)}{" "}
                  </pre>
                ) : (
                  ""
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="w-full px-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2 px-4 h-15">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              className="flex-1 px-4 py-2 border border-gray-300 bg-white focus:outline-none focus:border-blue-400 shadow-sm"
            />
            {isLoading ? (
              <button
                onClick={handleStopTask}
                className="px-5 py-2 bg-red-500 text-white font-semibold hover:bg-red-600 shadow"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                className="px-5 py-2 bg-blue-500 text-white font-semibold hover:bg-blue-600 shadow"
              >
                Send
              </button>
            )}
          </div>
        </div>

        {/* <div className="w-1/2 h-full bg-gray-100 flex flex-col relative">
          <div
            className="flex-1 flex items-center justify-center"
            ref={sandboxStreamContainerRef}
          >
            {sandboxStreamUrl ? (
              <iframe
                src={sandboxStreamUrl}
                title="Sandbox Stream"
                className="w-full h-full bg-black rounded-lg border border-gray-300 shadow"
                allow="clipboard-read; clipboard-write"
              />
            ) : (
              <div className="text-gray-400 text-lg font-medium"></div>
            )}
          </div>
          <div className="flex justify-center items-center px-4 h-15">
            {sandboxStreamUrl ? (
              <button
                onClick={handleStopSandboxSession}
                className="px-4 py-2 bg-red-500 text-white font-semibold hover:bg-red-600 shadow transition"
                disabled={!sandboxStreamUrl}
              >
                Stop
              </button>
            ) : null}
          </div>
        </div> */}
      </div>
    </>
  );
}

function addSystemMessage(setMessages, text) {
  setMessages((prev) => [
    ...prev,
    { role: MESSAGE_ROLE.SYSTEM, id: `system-${Date.now()}`, content: text },
  ]);
}

function addAssistantMessage(setMessages, text) {
  setMessages((prev) => [
    ...prev,
    {
      role: MESSAGE_ROLE.ASSISTANT,
      id: `assistant-${Date.now()}`,
      content: text,
    },
  ]);
}

function addAssistantTaskActionMessage(setMessages, action) {
  setMessages((prev) => [
    ...prev,
    {
      role: MESSAGE_ROLE.ASSISTANT_TASK_ACTION,
      id: `assistant-task-action-${Date.now()}`,
      action,
      status: "pending",
    },
  ]);
}

function updateLastAssistantTaskActionMessage(setMessages, status) {
  setMessages((prev) => {
    const lastActionIndex = [...prev]
      .reverse()
      .findIndex((msg) => msg.role === MESSAGE_ROLE.ASSISTANT_TASK_ACTION);
    if (lastActionIndex === -1) return prev;
    const actualIndex = prev.length - 1 - lastActionIndex;
    return prev.map((msg, index) =>
      index === actualIndex ? { ...msg, status: status } : msg
    );
  });
}
