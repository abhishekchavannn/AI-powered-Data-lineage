import React, { useEffect, useRef, useState } from "react";
import UseLineageData from "./UseLineageData";
import RenderLineageGraph from "./RenderLineageGraph";
import * as d3 from "d3";

import {
  COLUMN_WIDTH,
  COLUMN_PADDING,
  HEADER_HEIGHT,
  LIST_ITEM_HEIGHT,
  LIST_ITEM_PADDING,
  COLOR_SCALE_RANGE,
  TRANSFORMATION_COLORS,
  IMPACT_HIGHLIGHT_COLOR,
} from "./contants";
import "./LineageGraph.css";

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

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, system, attribute
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Function to export SVG as PNG
  const exportAsImage = () => {
    const svg = svgRef.current;
    if (!svg) return;

    // Get computed dimensions of the SVG
    const svgRect = svg.getBoundingClientRect();

    // Calculate full content dimensions by examining all elements
    // This ensures we capture all content regardless of visible area
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
        // Some elements might not support getBBox
        console.log("Skipping element for bbox calculation");
      }
    });

    // If we couldn't determine bounds, use the full SVG dimensions
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

    // Calculate content dimensions
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Create a properly sized SVG that includes all content
    const newSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    const padding = 100; // More padding to ensure content isn't cropped

    newSvg.setAttribute("width", contentWidth + padding * 2);
    newSvg.setAttribute("height", contentHeight + padding * 2);
    newSvg.setAttribute(
      "viewBox",
      `${minX - padding} ${minY - padding} ${contentWidth + padding * 2} ${
        contentHeight + padding * 2
      }`
    );

    // Clone the original SVG content
    const contentGroup = svg.querySelector("g").cloneNode(true);
    newSvg.appendChild(contentGroup);

    // Convert SVG to data URL
    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(newSvg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    // Create canvas with appropriate dimensions
    const canvas = document.createElement("canvas");
    const scale = 2; // Higher resolution
    canvas.width = (contentWidth + padding * 2) * scale;
    canvas.height = (contentHeight + padding * 2) * scale;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw SVG to canvas
    const img = new Image();
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      // Convert canvas to PNG and download
      const png = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "lineage-graph.png";
      link.href = png;
      link.click();
    };

    img.src = url;
  };

  // Add the Legend component
  const Legend = ({ data, showImpactAnalysis }) => {
    if (!data || !data.nodes) return null;

    // Extract systems from data
    const systems = [...new Set(data.nodes.map((node) => node.system))];

    // Create color scale for systems
    const colorScale = d3
      .scaleOrdinal()
      .domain(systems)
      .range(COLOR_SCALE_RANGE);

    return (
      <div className="legend-container">
        {/* Systems Legend */}
        <div className="legend-section">
          <h4 className="legend-title">Systems</h4>
          <div className="legend-items">
            {systems.map((system, index) => (
              <div key={`system-${index}`} className="legend-item">
                <div
                  className="legend-color-box"
                  style={{
                    backgroundColor: colorScale(system),
                    borderRadius: "2px",
                  }}
                ></div>
                <span>{system}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Direction Legend */}
        <div className="legend-section">
          <h4 className="legend-title">Direction</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-arrow right-arrow"></div>
              <span>Left to Right Flow</span>
            </div>
            <div className="legend-item">
              <div className="legend-arrow left-arrow"></div>
              <span>Right to Left Flow</span>
            </div>
          </div>
        </div>

        {/* Impact Analysis Legend - Only show when impact analysis is enabled */}
        {showImpactAnalysis && (
          <div className="legend-section">
            <h4 className="legend-title">Impact Analysis</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div
                  className="legend-color-box"
                  style={{
                    backgroundColor: IMPACT_HIGHLIGHT_COLOR,
                    borderRadius: "50%",
                  }}
                ></div>
                <span>Selected Line</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Apply search filter
  useEffect(() => {
    if (!data) return;

    if (!searchTerm.trim()) {
      setFilteredData(data);
      return;
    }

    const term = searchTerm.toLowerCase();

    // Create a deep copy of the data to avoid mutating the original
    const filtered = JSON.parse(JSON.stringify(data));

    // Filter nodes based on search term and filter type
    filtered.nodes = filtered.nodes.filter((node) => {
      const systemMatch = node.system.toLowerCase().includes(term);
      const attributeMatch = node.attribute.toLowerCase().includes(term);

      if (filterType === "all") return systemMatch || attributeMatch;
      if (filterType === "system") return systemMatch;
      if (filterType === "attribute") return attributeMatch;
      return true;
    });

    // Filter links to only include connections between filtered nodes
    const filteredNodeIds = new Set(filtered.nodes.map((node) => node.id));
    filtered.links = filtered.links.filter((link) => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    setFilteredData(filtered);
  }, [data, searchTerm, filterType]);

  // Render the graph whenever filtered data changes
  useEffect(() => {
    if (!filteredData || !svgRef.current) return;

    RenderLineageGraph({
      svgRef,
      data: filteredData,
      showImpactAnalysis,
      selectedNode,
      setSelectedNode,
      columnWidth: COLUMN_WIDTH,
      columnPadding: COLUMN_PADDING,
      headerHeight: HEADER_HEIGHT,
      listItemHeight: LIST_ITEM_HEIGHT,
      listItemPadding: LIST_ITEM_PADDING,
    });
  }, [filteredData, showImpactAnalysis, selectedNode]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) return <div>Loading lineage graph...</div>;
  if (error) return <div>{error}</div>;
  if (!data)
    return <div>No data available. Please upload a CSV file first.</div>;

  return (
    <div className="graph-container">
      <div className="dashboard-layout">
        {/* Collapsible Sidebar */}
        <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-toggle" onClick={toggleSidebar}>
            {sidebarOpen ? "<" : ">"}
          </div>

          <div className="sidebar-content">
            <h3>Impact Analysis</h3>
            <div className="sidebar-section">
              <label className="impact-analysis">
                <input
                  type="checkbox"
                  checked={showImpactAnalysis}
                  onChange={(e) => setShowImpactAnalysis(e.target.checked)}
                />
                <span>Enable Impact Analysis</span>
              </label>
            </div>

            <h3>Search & Filter</h3>
            <div className="sidebar-section">
              <div className="search-controls">
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                {searchTerm && (
                  <button onClick={clearSearch} className="clear-search">
                    ×
                  </button>
                )}
              </div>

              <div className="filter-controls">
                <label htmlFor="filter-type">Filter by:</label>
                <select
                  id="filter-type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-type"
                >
                  <option value="all">All</option>
                  <option value="system">System</option>
                  <option value="attribute">Attribute</option>
                </select>
              </div>
            </div>

            <div className="instructions">
              {showImpactAnalysis && (
                <p>Click on an attribute to see its direct connections</p>
              )}
              {selectedNode && (
                <div className="selected-node">
                  Selected:{" "}
                  <strong>
                    {selectedNode.system}.{selectedNode.attribute}
                  </strong>
                </div>
              )}
            </div>

            {filteredData && filteredData.columns && (
              <div className="search-stats">
                Showing{" "}
                {filteredData.columns.reduce(
                  (total, col) => total + col.items.length,
                  0
                )}{" "}
                nodes
                {searchTerm ? ` matching "${searchTerm}"` : ""}
              </div>
            )}

            {/* Export Button */}
            <div className="sidebar-section">
              <button onClick={exportAsImage} className="export-button">
                Export as Image
              </button>
            </div>

            <h3>Legend</h3>
            <Legend
              data={filteredData}
              showImpactAnalysis={showImpactAnalysis}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className={`main-content ${!sidebarOpen ? "expanded" : ""}`}>
          <div className="graph-wrapper">
            <svg ref={svgRef} className="lineage-graph"></svg>
            <div className="zoom-controls">
              <button
                onClick={() => {
                  const svg = d3.select(svgRef.current);
                  const zoom = d3.zoom().on("zoom", (event) => {
                    svg.select("g").attr("transform", event.transform);
                  });
                  svg.transition().call(zoom.scaleBy, 1.2);
                }}
              >
                +
              </button>
              <button
                onClick={() => {
                  const svg = d3.select(svgRef.current);
                  const zoom = d3.zoom().on("zoom", (event) => {
                    svg.select("g").attr("transform", event.transform);
                  });
                  svg.transition().call(zoom.scaleBy, 0.8);
                }}
              >
                −
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineageGraph;
