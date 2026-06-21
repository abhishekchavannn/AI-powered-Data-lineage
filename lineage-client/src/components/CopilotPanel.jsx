import { useState, useRef, useEffect } from "react";
import UseCopilotChat from "./UseCopilotChat";

const SUGGESTED_PROMPTS = [
  "Explain this pipeline",
  "Which source systems feed this dashboard?",
  "What breaks if this table is removed?",
  "Show me all paths from source to dashboard",
  "Find unnecessary transformations",
  "Which attributes have the highest blast radius?",
];

function AiSparklesIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.813 2.25a.75.75 0 01.726.568l1.044 4.173 4.173 1.044a.75.75 0 010 1.454l-4.173 1.044-1.044 4.173a.75.75 0 01-1.454 0l-1.044-4.173-4.173-1.044a.75.75 0 010-1.454l4.173-1.044 1.044-4.173a.75.75 0 01.726-.568zM4.5 14.25a.75.75 0 01.568.726l.696 2.784 2.784.696a.75.75 0 010 1.454l-2.784.696-.696 2.784a.75.75 0 01-1.454 0l-.696-2.784-2.784-.696a.75.75 0 010-1.454l2.784-.696.696-2.784a.75.75 0 01.886-.726zM17.25 12a.75.75 0 01.568.726l.696 2.784 2.784.696a.75.75 0 010 1.454l-2.784.696-.696 2.784a.75.75 0 01-1.454 0l-.696-2.784-2.784-.696a.75.75 0 010-1.454l2.784-.696.696-2.784A.75.75 0 0117.25 12z" />
    </svg>
  );
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function MarkdownContent({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="mb-1.5 mt-2 text-sm font-semibold text-foreground first:mt-0">
          {renderInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="mb-1 mt-1.5 text-xs font-semibold text-foreground">
          {renderInline(line.slice(4))}
        </h4>
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <p key={i} className="ml-4 text-xs leading-relaxed text-muted-foreground">
          {renderInline(line)}
        </p>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <p
          key={i}
          className="ml-3 text-xs leading-relaxed text-muted-foreground before:mr-2 before:text-muted-foreground/50 before:content-['•']"
        >
          {renderInline(line.slice(2))}
        </p>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <p key={i} className="text-xs leading-relaxed text-muted-foreground">
          {renderInline(line)}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function ChatBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-[16px] px-3.5 py-2.5 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : message.isError
              ? "border border-destructive/30 bg-destructive/5 text-destructive"
              : "border border-border bg-secondary/60 text-foreground"
        }`}
      >
        {isUser ? (
          <p className="text-xs leading-relaxed">{message.content}</p>
        ) : (
          <MarkdownContent text={message.content} />
        )}
      </div>
    </div>
  );
}

const CopilotPanel = ({ open, onToggle, selectedNode }) => {
  const { messages, loading, sendMessage, clearChat } = UseCopilotChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input, selectedNode);
    setInput("");
  };

  const handlePrompt = (prompt) => {
    sendMessage(prompt, selectedNode);
  };

  const contextLabel = selectedNode
    ? `${selectedNode.system}.${selectedNode.attribute}`
    : null;

  if (!open) {
    return (
      <div className="relative flex w-14 shrink-0 flex-col border-l border-border bg-card">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Open copilot"
          className="absolute left-1/2 top-4 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded bg-secondary transition-colors hover:bg-[#e4e7eb]"
        >
          <AiSparklesIcon className="h-[18px] w-[18px] text-primary" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-[24rem] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex items-start gap-2 border-b border-border px-4 py-4">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse copilot"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded bg-secondary transition-colors hover:bg-[#e4e7eb]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AiSparklesIcon className="h-4 w-4 shrink-0 text-primary" />
            <p className="cb-section-label">Lineage Copilot</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ask about pipelines, impact, and paths
          </p>
          {contextLabel ? (
            <p className="mt-2 truncate text-xs font-semibold text-primary">
              Context: {contextLabel}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="shrink-0 rounded px-2 py-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <div ref={scrollRef} className="cb-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              I use lineage tools to answer questions about your graph. Select a node for better context, or try a suggestion below.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePrompt(prompt)}
                  disabled={loading}
                  className="rounded-[12px] border border-border bg-secondary/40 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <ChatBubble key={idx} message={msg} />
            ))}
            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-[16px] border border-border bg-secondary/60 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                    </span>
                    Thinking…
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about lineage…"
            disabled={loading}
            className="h-11 min-w-0 flex-1 rounded-[12px] border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Send message"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CopilotPanel;
