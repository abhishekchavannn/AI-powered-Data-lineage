import { useState, useCallback, useRef } from "react";
import axios from "axios";

const getSessionId = () => {
  const key = "lineage-copilot-session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
};

const UseCopilotChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(getSessionId());

  const sendMessage = useCallback(async (message, contextNode = null) => {
    if (!message?.trim() || loading) return;

    const userMessage = { role: "user", content: message.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        "http://localhost:8083/api/lineage/copilot/chat",
        {
          message: message.trim(),
          sessionId: sessionIdRef.current,
          contextNode: contextNode
            ? {
                system: contextNode.system,
                dataset: contextNode.dataset,
                attribute: contextNode.attribute,
              }
            : null,
        }
      );

      if (response.data.sessionId) {
        sessionIdRef.current = response.data.sessionId;
        sessionStorage.setItem("lineage-copilot-session", response.data.sessionId);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.answer },
      ]);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.answer ||
        err.message ||
        "Failed to reach copilot";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}`, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    const newId = crypto.randomUUID();
    sessionIdRef.current = newId;
    sessionStorage.setItem("lineage-copilot-session", newId);
  }, []);

  return { messages, loading, error, sendMessage, clearChat };
};

export default UseCopilotChat;
