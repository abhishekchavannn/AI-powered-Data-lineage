import { useState } from "react";

const CRITICALITY_STYLES = {
  HIGH: {
    badge: "bg-[#cf202f]/10 text-[#cf202f] ring-[#cf202f]/20",
    dot: "bg-[#cf202f]",
  },
  MEDIUM: {
    badge: "bg-[#f4b000]/10 text-[#b88600] ring-[#f4b000]/20",
    dot: "bg-[#f4b000]",
  },
  LOW: {
    badge: "bg-secondary text-muted-foreground ring-border",
    dot: "bg-muted-foreground",
  },
};

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

function isQuotaExceededMessage(text) {
  if (!text) return false;
  return /quota exceeded|rate limit|429/i.test(text);
}

function sanitizeAiSummary(text) {
  if (!text) return text;
  return text
    .replace(/\n*---\n\*AI quota exceeded[^*]*\*/gi, "")
    .replace(/\*AI quota exceeded[^*]*\*/gi, "")
    .trim();
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] bg-secondary ${className}`}
    />
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="cb-card-sm flex flex-col items-center gap-1 py-2.5 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-mono text-lg font-medium tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function CriticalityBadge({ level }) {
  const style = CRITICALITY_STYLES[level] || CRITICALITY_STYLES.LOW;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1 ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {level}
    </span>
  );
}

function MarkdownContent({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h3
          key={i}
          className="mb-2 mt-3 text-sm font-semibold text-foreground first:mt-0"
        >
          {renderInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h4
          key={i}
          className="mb-1 mt-2 text-sm font-semibold text-foreground"
        >
          {renderInline(line.slice(4))}
        </h4>
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <p
          key={i}
          className="ml-4 text-xs leading-relaxed text-muted-foreground"
        >
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
    } else if (line.startsWith("---")) {
      elements.push(
        <hr key={i} className="my-2 border-border" />
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <p
          key={i}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
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

const ImpactAnalysisPanel = ({ result, loading, error, onClose, onRetry }) => {
  const [expandedDepths, setExpandedDepths] = useState({});

  const visibleError = error && !isQuotaExceededMessage(error) ? error : null;
  const isOpen = loading || !!result || !!visibleError;

  const toggleDepth = (depth) => {
    setExpandedDepths((prev) => ({ ...prev, [depth]: !prev[depth] }));
  };

  const sectionLabel = "cb-section-label";
  const aiSummary = sanitizeAiSummary(result?.aiChangeSummary);

  const depsByDepth = {};
  if (result?.downstreamDependencies) {
    result.downstreamDependencies.forEach((dep) => {
      if (!depsByDepth[dep.depth]) depsByDepth[dep.depth] = [];
      depsByDepth[dep.depth].push(dep);
    });
  }

  return (
    <div
      className={`absolute bottom-0 right-0 top-0 z-20 flex flex-col border-l border-border bg-card transition-transform duration-300 ease-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ width: "28rem" }}
    >
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AiSparklesIcon className="h-4 w-4 shrink-0 text-primary" />
            <p className={sectionLabel}>AI Impact Analysis</p>
          </div>
          {result?.selectedNode && (
            <p className="mt-3 truncate text-sm font-semibold text-primary">
              {result.selectedNode.fullId}
            </p>
          )}
          {loading && (
            <SkeletonBlock className="mt-3 h-4 w-48" />
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary"
          aria-label="Close panel"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="cb-scroll flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
        {visibleError && (
          <div className="cb-card-sm border-destructive/30 bg-destructive/5">
            <p className="text-xs font-medium text-destructive">
              {visibleError}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="cb-btn-primary mt-3 h-9 px-4 text-sm"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {loading && (
          <>
            <section className="cb-section">
              <h3 className={sectionLabel}>Blast radius</h3>
              <div className="grid grid-cols-2 gap-2">
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
              </div>
            </section>
            <section className="cb-section">
              <h3 className={sectionLabel}>Dependencies</h3>
              <div className="space-y-2">
                <SkeletonBlock className="h-9" />
                <SkeletonBlock className="h-9" />
                <SkeletonBlock className="h-9" />
              </div>
            </section>
            <section className="cb-section">
              <h3 className={sectionLabel}>AI analysis</h3>
              <div className="cb-card-sm space-y-2">
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-3" />
                <SkeletonBlock className="h-3 w-5/6" />
                <SkeletonBlock className="h-3 w-2/3" />
              </div>
            </section>
          </>
        )}

        {result && (
          <>
            <section className="cb-section">
              <h3 className={sectionLabel}>Blast radius</h3>
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label="Affected nodes"
                  value={result.blastRadius.totalAffectedNodes}
                  icon={
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
                <StatCard
                  label="Systems"
                  value={result.blastRadius.affectedSystems.length}
                  icon={
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  }
                />
                <StatCard
                  label="Max depth"
                  value={result.blastRadius.maxDepth}
                  icon={
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  }
                />
                <StatCard
                  label="Direct deps"
                  value={result.blastRadius.directDependencies}
                  icon={
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  }
                />
              </div>
              {result.blastRadius.affectedSystems.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.blastRadius.affectedSystems.map((sys) => (
                    <span
                      key={sys}
                      className="cb-badge-pill text-primary"
                    >
                      {sys}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="cb-section">
              <h3 className={sectionLabel}>
                Downstream dependencies ({result.downstreamDependencies.length})
              </h3>
              <div className="space-y-2">
                {Object.entries(depsByDepth).map(([depth, deps]) => {
                  const isExpanded = expandedDepths[depth] !== false;
                  return (
                    <div
                      key={depth}
                      className="cb-card-sm overflow-hidden p-0"
                    >
                      <button
                        type="button"
                        onClick={() => toggleDepth(depth)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/60"
                      >
                        <svg
                          className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <span className="text-xs font-semibold text-foreground">
                          Depth {depth}
                        </span>
                        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
                          {deps.length}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="space-y-1 border-t border-border px-3 py-2">
                          {deps.map((dep, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 rounded-[8px] px-1.5 py-1 transition-colors hover:bg-secondary/40"
                            >
                              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-foreground">
                                  {dep.node.fullId}
                                </p>
                                <p className="text-[0.6875rem] text-muted-foreground">
                                  {dep.transformationType}
                                  {dep.transformationLogic
                                    ? ` — ${dep.transformationLogic}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {result.downstreamDependencies.length === 0 && (
                  <p className="cb-card-sm text-xs text-muted-foreground">
                    No downstream dependencies found. This is a terminal node.
                  </p>
                )}
              </div>
            </section>

            {result.criticalItems.length > 0 && (
              <section className="cb-section">
                <h3 className={sectionLabel}>
                  Critical items ({result.criticalItems.length})
                </h3>
                <div className="space-y-2">
                  {result.criticalItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="cb-card-sm"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <CriticalityBadge level={item.criticality} />
                        <span className="truncate text-xs font-semibold text-foreground">
                          {item.node.fullId}
                        </span>
                      </div>
                      <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {aiSummary && (
              <section className="cb-section">
                <h3 className={sectionLabel}>
                  <span className="inline-flex items-center gap-1.5">
                    <AiSparklesIcon className="h-3.5 w-3.5 text-primary" />
                    AI change summary
                  </span>
                </h3>
                <div className="cb-card-sm">
                  <MarkdownContent text={aiSummary} />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ImpactAnalysisPanel;
