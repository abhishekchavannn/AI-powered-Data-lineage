import { useEffect, useRef, useState, useCallback } from "react";
import UseLineageData from "./UseLineageData";
import UseImpactAnalysis from "./UseImpactAnalysis";
import RenderLineageGraph from "./RenderLineageGraph";
import ImpactAnalysisPanel from "./ImpactAnalysisPanel";
import CopilotPanel from "./CopilotPanel";
import * as d3 from "d3";

import {
  COLUMN_WIDTH,
  COLUMN_PADDING,
  HEADER_HEIGHT,
  LIST_ITEM_HEIGHT,
  LIST_ITEM_PADDING,
  COLOR_SCALE_RANGE,
  IMPACT_HIGHLIGHT_COLOR,
} from "./constants";

const LineageGraph = () => {
  const svgRef = useRef(null);
  const {
    data,
    loading,
    error,
    showImpactAnalysis,
    setShowImpactAnalysis,
    selectedNode,
    setSelectedNode,
  } = UseLineageData();

  const {
    analyzeNode,
    result: impactResult,
    loading: impactLoading,
    error: impactError,
    clearResult: clearImpactResult,
  } = UseImpactAnalysis();

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copilotOpen, setCopilotOpen] = useState(true);

  const lastAnalyzedRef = useRef(null);

  const handleNodeAnalyze = useCallback(
    (node) => {
      if (!showImpactAnalysis || !node) return;
      const key = `${node.system}|||${node.dataset}|||${node.attribute}`;
      if (lastAnalyzedRef.current === key) return;
      lastAnalyzedRef.current = key;
      analyzeNode(node.system, node.dataset, node.attribute);
    },
    [showImpactAnalysis, analyzeNode]
  );

  useEffect(() => {
    if (selectedNode && showImpactAnalysis) {
      handleNodeAnalyze(selectedNode);
    }
    if (!selectedNode) {
      lastAnalyzedRef.current = null;
    }
  }, [selectedNode, showImpactAnalysis, handleNodeAnalyze]);

  useEffect(() => {
    if (!showImpactAnalysis) {
      clearImpactResult();
      lastAnalyzedRef.current = null;
    }
  }, [showImpactAnalysis, clearImpactResult]);

  const handleClosePanel = () => {
    setSelectedNode(null);
    clearImpactResult();
    lastAnalyzedRef.current = null;
  };

  const handleRetryAnalysis = () => {
    if (selectedNode) {
      lastAnalyzedRef.current = null;
      handleNodeAnalyze(selectedNode);
    }
  };

  const exportAsImage = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();

    const allElements = svg.querySelectorAll("*");
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    allElements.forEach((el) => {
      try {
        if (el.getBBox) {
          const bbox = el.getBBox();
          if (bbox.width > 0 && bbox.height > 0) {
            minX = Math.min(minX, bbox.x);
            minY = Math.min(minY, bbox.y);
            maxX = Math.max(maxX, bbox.x + bbox.width);
            maxY = Math.max(maxY, bbox.y + bbox.height);
          }
        }
      } catch (e) {
        console.log("Skipping element for bbox calculation");
      }
    });

    if (
      minX === Infinity ||
      minY === Infinity ||
      maxX === -Infinity ||
      maxY === -Infinity
    ) {
      minX = 0;
      minY = 0;
      maxX = svgRect.width;
      maxY = svgRect.height;
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const newSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    const padding = 100;

    newSvg.setAttribute("width", contentWidth + padding * 2);
    newSvg.setAttribute("height", contentHeight + padding * 2);
    newSvg.setAttribute(
      "viewBox",
      `${minX - padding} ${minY - padding} ${contentWidth + padding * 2} ${
        contentHeight + padding * 2
      }`
    );

    const contentGroup = svg.querySelector("g").cloneNode(true);
    newSvg.appendChild(contentGroup);

    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(newSvg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = (contentWidth + padding * 2) * scale;
    canvas.height = (contentHeight + padding * 2) * scale;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const png = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "lineage-graph.png";
      link.href = png;
      link.click();
    };

    img.src = url;
  };

  const Legend = ({ data, showImpactAnalysis }) => {
    if (!data || !data.nodes) return null;

    const systems = [...new Set(data.nodes.map((node) => node.system))];

    const colorScale = d3
      .scaleOrdinal()
      .domain(systems)
      .range(COLOR_SCALE_RANGE);

    const sectionLabel = "cb-section-label mb-3";

    return (
      <div className="cb-card space-y-6 py-5">
        <div>
          <h4 className={sectionLabel}>Systems</h4>
          <div className="space-y-3">
            {systems.map((system, index) => (
              <div
                key={`system-${index}`}
                className="flex items-center min-h-[2.75rem] text-[0.8125rem] leading-snug gap-3"
              >
                <div
                  className="h-3.5 w-3.5 shrink-0 rounded bg-secondary ring-1 ring-border"
                  style={{
                    backgroundColor: colorScale(system),
                  }}
                />
                <span className="text-sm font-semibold text-foreground">{system}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" aria-hidden />

        <div>
          <h4 className={sectionLabel}>Direction</h4>
          <div className="space-y-1">
            <div className="flex items-center min-h-[2.75rem] text-[0.8125rem] leading-snug gap-3">
              <span className="w-7 shrink-0 text-center text-muted-foreground tabular-nums">→</span>
              <span>Left to right flow</span>
            </div>
            <div className="flex items-center min-h-[2.75rem] text-[0.8125rem] leading-snug gap-3">
              <span className="w-7 shrink-0 text-center text-muted-foreground tabular-nums">←</span>
              <span>Right to left flow</span>
            </div>
          </div>
        </div>

        {showImpactAnalysis && (
          <>
            <div className="h-px bg-border" aria-hidden />
            <div>
              <h4 className={sectionLabel}>Impact</h4>
              <div className="flex items-center min-h-[2.75rem] text-[0.8125rem] leading-snug gap-3">
                <div
                  className="h-3.5 w-3.5 shrink-0 rounded"
                  style={{
                    backgroundColor: IMPACT_HIGHLIGHT_COLOR,
                  }}
                />
                <span className="text-sm font-semibold text-foreground">Selected line</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!data) return;

    if (!searchTerm.trim()) {
      setFilteredData(data);
      return;
    }

    const term = searchTerm.toLowerCase();

    const filtered = JSON.parse(JSON.stringify(data));

    filtered.nodes = filtered.nodes.filter((node) => {
      const systemMatch = node.system.toLowerCase().includes(term);
      const attributeMatch = node.attribute.toLowerCase().includes(term);

      if (filterType === "all") return systemMatch || attributeMatch;
      if (filterType === "system") return systemMatch;
      if (filterType === "attribute") return attributeMatch;
      return true;
    });

    const filteredNodeIds = new Set(filtered.nodes.map((node) => node.id));
    filtered.links = filtered.links.filter((link) => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    setFilteredData(filtered);
  }, [data, searchTerm, filterType]);

  useEffect(() => {
    if (!filteredData || !svgRef.current) return;

    RenderLineageGraph({
      svgRef,
      data: filteredData,
      showImpactAnalysis,
      selectedNode,
      setSelectedNode,
      onNodeAnalyze: handleNodeAnalyze,
      columnWidth: COLUMN_WIDTH,
      columnPadding: COLUMN_PADDING,
      headerHeight: HEADER_HEIGHT,
      listItemHeight: LIST_ITEM_HEIGHT,
      listItemPadding: LIST_ITEM_PADDING,
    });
  }, [filteredData, showImpactAnalysis, selectedNode, handleNodeAnalyze]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <div className="space-y-5 text-center">
        <div className="relative mx-auto h-16 w-16">
          <div className="absolute inset-0 rounded border-4 border-secondary"></div>
          <div className="absolute inset-0 animate-spin rounded border-4 border-transparent border-t-primary"></div>
        </div>
        <p className="text-sm text-muted-foreground">Loading lineage graph...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="flex h-96 items-center justify-center">
      <div className="max-w-md rounded-[24px] border border-destructive/30 bg-card p-6 text-destructive">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-destructive/10">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold">{error}</span>
        </div>
      </div>
    </div>
  );
  
  if (!data) return (
    <div className="flex h-96 items-center justify-center">
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded bg-secondary">
          <svg className="h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">No data available. Please upload a CSV file first.</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto h-[calc(100vh-8rem)] w-full max-w-8xl overflow-hidden rounded-[24px] border border-border bg-card">
      <div className="flex h-full">
        <div
          className={`relative flex flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-300 ease-out ${sidebarOpen ? "w-[22rem]" : "w-14 shrink-0"}`}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={`absolute z-10 flex h-11 w-11 items-center justify-center rounded bg-secondary transition-colors hover:bg-[#e4e7eb] active:scale-[0.97] ${sidebarOpen ? "right-4 top-5" : "left-1/2 top-4 -translate-x-1/2"}`}
          >
            {sidebarOpen ? (
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          {sidebarOpen && (
            <div className="cb-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
              <div className="px-5 pb-8 pt-[4.25rem]">
                <div className="flex flex-col gap-10">
                  <section aria-labelledby="sidebar-impact-heading" className="cb-section">
                    <h3 id="sidebar-impact-heading" className="cb-section-label">
                      Impact analysis
                    </h3>
                    <div className="cb-card py-1">
                      <label className="flex min-h-11 cursor-pointer items-center gap-4 py-2.5 active:opacity-80">
                        <input
                          type="checkbox"
                          checked={showImpactAnalysis}
                          onChange={(e) => setShowImpactAnalysis(e.target.checked)}
                          className="h-[22px] w-[22px] shrink-0 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground">
                          Enable impact analysis
                        </span>
                      </label>
                    </div>
                  </section>

                  <section aria-labelledby="sidebar-search-heading" className="cb-section">
                    <h3 id="sidebar-search-heading" className="cb-section-label">
                      Search &amp; filter
                    </h3>
                    <div className="cb-card flex flex-col gap-5">
                      <div className="relative">
                        <input
                          type="search"
                          placeholder="Search nodes"
                          value={searchTerm}
                          onChange={handleSearchChange}
                          className="cb-search-pill pr-11"
                        />
                        {searchTerm ? (
                          <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            aria-label="Clear search"
                          >
                            <span className="text-lg leading-none">×</span>
                          </button>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        <label htmlFor="filter-type" className="cb-section-label normal-case">
                          Filter by
                        </label>
                        <select
                          id="filter-type"
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="h-12 w-full appearance-none rounded-[12px] border border-border bg-card px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="all">All</option>
                          <option value="system">System</option>
                          <option value="attribute">Attribute</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {showImpactAnalysis ? (
                    <p className="rounded-[24px] border border-border bg-secondary/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                      Click an attribute on the graph to run AI-powered impact analysis and see downstream dependencies.
                    </p>
                  ) : null}

                  {selectedNode ? (
                    <div className="rounded-[24px] border border-primary/20 bg-primary/5 px-4 py-4">
                      <p className="cb-section-label mb-1">Selected</p>
                      <p className="text-base font-semibold text-primary">
                        {selectedNode.system}.{selectedNode.attribute}
                      </p>
                    </div>
                  ) : null}

                  {filteredData && filteredData.nodes ? (
                    <p className="px-0.5 text-sm text-muted-foreground">
                      Showing{" "}
                      <span className="font-mono font-medium text-foreground">
                        {filteredData.nodes.length}
                      </span>{" "}
                      nodes
                      {searchTerm ? (
                        <>
                          {" "}
                          matching &ldquo;{searchTerm}&rdquo;
                        </>
                      ) : null}
                      .
                    </p>
                  ) : null}

                  <section aria-labelledby="sidebar-export-heading">
                    <h3
                      id="sidebar-export-heading"
                      className="sr-only"
                    >
                      Export
                    </h3>
                    <button
                      type="button"
                      onClick={exportAsImage}
                      className="cb-btn-secondary w-full gap-3"
                    >
                      <svg className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Export as image</span>
                    </button>
                  </section>

                  <section aria-labelledby="sidebar-legend-heading" className="cb-section">
                    <h3 id="sidebar-legend-heading" className="cb-section-label">
                      Legend
                    </h3>
                    <Legend
                      data={filteredData}
                      showImpactAnalysis={showImpactAnalysis}
                    />
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative flex-1 overflow-hidden bg-[#0a0b0d] p-6">
          <svg ref={svgRef} className="h-full w-full rounded-[24px]"></svg>

          {showImpactAnalysis && (
            <ImpactAnalysisPanel
              result={impactResult}
              loading={impactLoading}
              error={impactError}
              onClose={handleClosePanel}
              onRetry={handleRetryAnalysis}
            />
          )}
          
          <div className="absolute bottom-8 right-8 flex space-x-3">
            <button
              onClick={() => {
                const svg = d3.select(svgRef.current);
                const zoom = d3.zoom().on("zoom", (event) => {
                  svg.select("g").attr("transform", event.transform);
                });
                svg.transition().call(zoom.scaleBy, 1.2);
              }}
              className="flex h-11 w-11 items-center justify-center rounded border border-white/10 bg-[#16181c] text-white transition-colors hover:bg-[#1e2025]"
              aria-label="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => {
                const svg = d3.select(svgRef.current);
                const zoom = d3.zoom().on("zoom", (event) => {
                  svg.select("g").attr("transform", event.transform);
                });
                svg.transition().call(zoom.scaleBy, 0.8);
              }}
              className="flex h-11 w-11 items-center justify-center rounded border border-white/10 bg-[#16181c] text-white transition-colors hover:bg-[#1e2025]"
              aria-label="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
              </svg>
            </button>
          </div>
        </div>

        <CopilotPanel
          open={copilotOpen}
          onToggle={() => setCopilotOpen(!copilotOpen)}
          selectedNode={selectedNode}
        />
      </div>
    </div>
  );
};

export default LineageGraph;
