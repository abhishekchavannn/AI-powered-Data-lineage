import * as d3 from "d3";
import {
  COLOR_SCALE_RANGE,
  TRANSFORMATION_COLORS,
  IMPACT_HIGHLIGHT_COLOR,
  STANDARD_LINK_OPACITY,
  HIGHLIGHTED_LINK_OPACITY,
} from "./contants";

const RenderLineageGraph = ({
  svgRef,
  data,
  showImpactAnalysis,
  selectedNode,
  setSelectedNode,
  columnWidth,
  columnPadding,
  headerHeight,
  listItemHeight,
  listItemPadding,
}) => {
  // Clear previous SVG
  d3.select(svgRef.current).selectAll("*").remove();

  const width = 1000;
  const height = 800;

  // Create main SVG with zoom behavior
  const svg = d3
    .select(svgRef.current)
    .attr("width", width)
    .attr("height", height);
  const mainGroup = svg.append("g");

  // Add zoom behavior
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", (event) => {
      mainGroup.attr("transform", event.transform);
    });
  svg.call(zoom);

  // Initial transform to center content
  const initialTransform = d3.zoomIdentity.translate(50, 50);
  svg.call(zoom.transform, initialTransform);

  // Group nodes by system
  const nodesBySystem = {};
  data.nodes.forEach((node) => {
    if (!nodesBySystem[node.system]) {
      nodesBySystem[node.system] = [];
    }
    nodesBySystem[node.system].push(node);
  });

  // Create sources (systems) as columns
  const systems = Object.keys(nodesBySystem);
  const colorScale = d3.scaleOrdinal().domain(systems).range(COLOR_SCALE_RANGE);

  // Define arrow markers and drop shadow
  const defs = mainGroup.append("defs");
  const dropShadow = defs
    .append("filter")
    .attr("id", "drop-shadow")
    .attr("height", "130%");
  dropShadow
    .append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", 3)
    .attr("result", "blur");
  dropShadow
    .append("feOffset")
    .attr("in", "blur")
    .attr("dx", 2)
    .attr("dy", 2)
    .attr("result", "offsetBlur");
  const feMerge = dropShadow.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "offsetBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  // Add markers for both left and right direction arrows
  defs
    .selectAll("marker")
    .data([
      "arrow-right",
      "arrow-right-highlighted",
      "arrow-left",
      "arrow-left-highlighted",
    ])
    .enter()
    .append("marker")
    .attr("id", (d) => d)
    .attr("viewBox", "0 -5 10 10")
    // Adjust refX values to make arrows connect properly
    .attr("refX", (d) => (d.includes("left") ? 0 : 25))
    .attr("refY", 0)
    .attr("markerWidth", 4)
    .attr("markerHeight", 4)
    .attr("orient", (d) => (d.includes("left") ? "auto-start-reverse" : "auto"))
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", (d) =>
      d.includes("highlighted") ? IMPACT_HIGHLIGHT_COLOR : "#aaa"
    );

  // Create source columns
  const columns = mainGroup.append("g").attr("class", "columns");
  const column = columns
    .selectAll(".column")
    .data(systems)
    .enter()
    .append("g")
    .attr("class", "column")
    .attr(
      "transform",
      (d, i) => `translate(${i * (columnWidth + columnPadding)}, 0)`
    )
    .call(
      d3
        .drag()
        .on("start", dragStartedColumn)
        .on("drag", draggedColumn)
        .on("end", dragEndedColumn)
    );

  // Column headers
  column
    .append("rect")
    .attr("class", "column-header")
    .attr("width", columnWidth)
    .attr("height", headerHeight)
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", "#2c2c2c")
    .attr("stroke", (d) => colorScale(d))
    .attr("stroke-width", 2)
    .attr("filter", "url(#drop-shadow)");

  column
    .append("text")
    .attr("x", columnWidth / 2)
    .attr("y", headerHeight / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("fill", "#e0e0e0")
    .style("font-size", "13px")
    .style("font-weight", "bold")
    .text((d) => d);

  // Column content background - Boxes
  column
    .append("rect")
    .attr("class", "column-content")
    .attr("width", columnWidth)
    .attr(
      "height",
      (d) => nodesBySystem[d].length * (listItemHeight + listItemPadding) + 20
    )
    .attr("y", headerHeight + 5)
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", "#1e1e1e")
    .attr("fill-opacity", 1) // Set to fully opaque
    .attr("stroke", (d) => colorScale(d))
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.6)
    .attr("filter", "url(#drop-shadow)");

  // Create nodes within each column
  systems.forEach((system, systemIndex) => {
    const systemNodes = nodesBySystem[system];
    const col = column.filter((d) => d === system);
    const items = col
      .append("g")
      .attr("class", "items")
      .attr("transform", `translate(0, ${headerHeight + 15})`);

    const item = items
      .selectAll(".item")
      .data(systemNodes)
      .enter()
      .append("g")
      .attr("class", "item")
      .attr(
        "transform",
        (d, i) => `translate(10, ${i * (listItemHeight + listItemPadding)})`
      )
      .on("click", (event, d) => {
        if (showImpactAnalysis) {
          setSelectedNode(selectedNode && selectedNode.id === d.id ? null : d);
        }
      });

    item
      .append("rect")
      .attr("class", "item-bg")
      .attr("width", columnWidth - 20)
      .attr("height", listItemHeight)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", "#3c3c3c")
      .attr("opacity", 0)
      .style("cursor", "pointer") // Add this line to set the cursor to pointer
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 0.3);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0);
      });

    // Add left-side connectors for incoming edges
    item
      .append("circle")
      .attr("class", (d) => `node-circle node-${d.id}-left`)
      .attr("cx", 4) // Move a bit to the left of the item
      .attr("cy", listItemHeight / 2)
      .attr("r", 4)
      .attr("fill", (d) => colorScale(d.system))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Add right-side connectors for outgoing edges
    item
      .append("circle")
      .attr("class", (d) => `node-circle node-${d.id}-right`)
      .attr("cx", columnWidth - 35) // Move slightly more inside the item
      .attr("cy", listItemHeight / 2)
      .attr("r", 4)
      .attr("fill", (d) => colorScale(d.system))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    item
      .append("text")
      .attr("x", 25)
      .attr("y", listItemHeight / 2)
      .attr("dominant-baseline", "central")
      .attr("fill", "#e0e0e0")
      .attr("font-size", "12px")
      .text((d) => d.attribute);

    systemNodes.forEach((node, i) => {
      node.leftX = systemIndex * (columnWidth + columnPadding) + 10; // Adjusted to point to the circle
      node.rightX =
        systemIndex * (columnWidth + columnPadding) + (columnWidth - 25); // Adjusted to point to the circle
      node.y =
        headerHeight +
        15 +
        i * (listItemHeight + listItemPadding) +
        listItemHeight / 2;
      node.parentSystem = system;
    });
  });

  // Function to create and update links
  function renderLinks() {
    mainGroup.selectAll(".links").remove();
    mainGroup.selectAll(".link-labels").remove();

    let directConnectionLinks = [];
    let connectedNodeIds = new Set();

    if (showImpactAnalysis && selectedNode) {
      directConnectionLinks = data.links.filter((link) => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;
        return sourceId === selectedNode.id || targetId === selectedNode.id;
      });

      directConnectionLinks.forEach((link) => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;
        if (sourceId === selectedNode.id) {
          connectedNodeIds.add(targetId);
        } else {
          connectedNodeIds.add(sourceId);
        }
      });
    }

    const linksGroup = mainGroup.append("g").attr("class", "links");
    const linksToDisplay =
      showImpactAnalysis && selectedNode ? directConnectionLinks : data.links;
    // Deduplicate links based on source and target attributes
    const uniqueLinksMap = new Map();
    linksToDisplay.forEach((link) => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;
      const key = `${sourceId}-${targetId}`;
      if (!uniqueLinksMap.has(key)) {
        uniqueLinksMap.set(key, link);
      }
    });
    const deduplicatedLinks = Array.from(uniqueLinksMap.values());

    const link = linksGroup
      .selectAll("path")
      .data(deduplicatedLinks)
      .enter()
      .append("path")
      .attr("d", (d, i) => {
        const sourceNode = data.nodes.find(
          (node) => node.id === (d.source.id || d.source)
        );
        const targetNode = data.nodes.find(
          (node) => node.id === (d.target.id || d.target)
        );

        if (!targetNode) return ""; // Skip if target node doesn't exist

        const offset = (i % 10) * 5 - 25;
        let sourceX, sourceY, targetX, targetY;
        let isReverseDirection = false;

        // Handle external source (like "SCALE1")
        if (!sourceNode) {
          // Assume external source is to the left of the first system
          const firstSystemIndex = 0;
          sourceX = firstSystemIndex * (columnWidth + columnPadding) - 50; // Position to the left of the first column
          sourceY = targetNode.y; // Align with the target node's y position
          targetX = targetNode.leftX;
          targetY = targetNode.y;
        } else {
          // Determine direction based on column positions
          const sourceSystem = systems.indexOf(sourceNode.parentSystem);
          const targetSystem = systems.indexOf(targetNode.parentSystem);

          // If target is to the left of source, we need to reverse the direction
          isReverseDirection = targetSystem < sourceSystem;

          if (isReverseDirection) {
            // For reverse direction (right to left)
            sourceX = sourceNode.leftX;
            sourceY = sourceNode.y;
            targetX = targetNode.rightX;
            targetY = targetNode.y;
          } else {
            // For normal direction (left to right)
            sourceX = sourceNode.rightX;
            sourceY = sourceNode.y;
            targetX = targetNode.leftX;
            targetY = targetNode.y;
          }
        }

        // If source and target are in the same system
        if (sourceNode && sourceNode.parentSystem === targetNode.parentSystem) {
          const columnIndex = systems.indexOf(sourceNode.parentSystem);
          const centerX =
            columnIndex * (columnWidth + columnPadding) + columnWidth / 2;
          const controlX = centerX + 70 + offset;
          return `M${sourceX},${sourceY} C${controlX},${sourceY} ${controlX},${targetY} ${targetX},${targetY}`;
        }

        // For external source or different systems
        const midX = sourceX + (targetX - sourceX) * 0.5;
        const controlY1 = sourceY + offset;
        const controlY2 = targetY + offset;
        return `M${sourceX},${sourceY} C${midX},${controlY1} ${midX},${controlY2} ${targetX},${targetY}`;
      })
      .attr("fill", "none")
      .attr("stroke", (d) => {
        if (showImpactAnalysis && selectedNode) {
          return IMPACT_HIGHLIGHT_COLOR;
        }
        return (
          TRANSFORMATION_COLORS[d.transformationType] ||
          colorScale(getSourceSystem(d))
        );
      })
      .attr("stroke-width", (d) =>
        showImpactAnalysis && selectedNode ? 2.5 : 1
      )
      .attr("stroke-opacity", (d) =>
        showImpactAnalysis && selectedNode
          ? HIGHLIGHTED_LINK_OPACITY
          : STANDARD_LINK_OPACITY
      )
      .attr("marker-end", (d) => {
        // Determine direction based on node positions
        const sourceNode = data.nodes.find(
          (node) => node.id === (d.source.id || d.source)
        );
        const targetNode = data.nodes.find(
          (node) => node.id === (d.target.id || d.target)
        );

        if (!sourceNode || !targetNode) return "url(#arrow-right)";

        const sourceSystem = systems.indexOf(sourceNode.parentSystem);
        const targetSystem = systems.indexOf(targetNode.parentSystem);

        // If target is to the left of source, we need to use the left arrow
        const isReverseDirection = targetSystem < sourceSystem;

        if (isReverseDirection) {
          return showImpactAnalysis && selectedNode
            ? "url(#arrow-left-highlighted)"
            : "url(#arrow-left)";
        } else {
          return showImpactAnalysis && selectedNode
            ? "url(#arrow-right-highlighted)"
            : "url(#arrow-right)";
        }
      });

    function getSourceSystem(link) {
      const sourceNode = data.nodes.find(
        (node) => node.id === (link.source.id || link.source)
      );
      return sourceNode ? sourceNode.system : "";
    }

    const linkLabels = mainGroup
      .append("g")
      .attr("class", "link-labels")
      .selectAll("g")
      .data(deduplicatedLinks)
      .enter()
      .append("g")
      .attr("opacity", showImpactAnalysis && selectedNode ? 1 : 0); // Only show labels when impact analysis is enabled

    linkLabels.each(function (d) {
      const sourceNode = data.nodes.find(
        (node) => node.id === (d.source.id || d.source)
      );
      const targetNode = data.nodes.find(
        (node) => node.id === (d.target.id || d.target)
      );

      if (!targetNode) return "";

      let sourceX, sourceY, targetX, targetY;
      let isReverseDirection = false;

      if (!sourceNode) {
        const firstSystemIndex = 0;
        sourceX = firstSystemIndex * (columnWidth + columnPadding) - 50;
        sourceY = targetNode.y;
        targetX = targetNode.leftX;
        targetY = targetNode.y;
      } else {
        // Determine direction based on column positions
        const sourceSystem = systems.indexOf(sourceNode.parentSystem);
        const targetSystem = systems.indexOf(targetNode.parentSystem);

        // If target is to the left of source, we need to reverse the direction
        isReverseDirection = targetSystem < sourceSystem;

        if (isReverseDirection) {
          // For reverse direction (right to left)
          sourceX = sourceNode.leftX;
          sourceY = sourceNode.y;
          targetX = targetNode.rightX;
          targetY = targetNode.y;
        } else {
          // For normal direction (left to right)
          sourceX = sourceNode.rightX;
          sourceY = sourceNode.y;
          targetX = targetNode.leftX;
          targetY = targetNode.y;
        }
      }

      const x = (sourceX + targetX) / 2;
      const y = (sourceY + targetY) / 2;

      const isDirectConnection =
        showImpactAnalysis &&
        selectedNode &&
        directConnectionLinks.some((link) => link.id === d.id);

      d3.select(this)
        .append("rect")
        .attr("x", x - 28)
        .attr("y", y - 10)
        .attr("width", 56)
        .attr("height", 18)
        .attr("rx", 9)
        .attr("ry", 9)
        .attr(
          "fill",
          isDirectConnection
            ? IMPACT_HIGHLIGHT_COLOR
            : TRANSFORMATION_COLORS[d.transformationType] || "#888"
        )
        .attr("fill-opacity", 0.8)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);

      d3.select(this)
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", "9px")
        .attr("font-weight", "bold")
        .attr("fill", "#fff")
        .text(d.transformationType);
    });

    mainGroup
      .selectAll(".node-circle")
      .attr("r", (d) => {
        if (showImpactAnalysis && selectedNode) {
          if (d.id === selectedNode.id) return 7;
          if (connectedNodeIds.has(d.id)) return 5;
          return 4;
        }
        return 4;
      })
      .attr("stroke-width", (d) => {
        if (showImpactAnalysis && selectedNode) {
          if (d.id === selectedNode.id) return 2.5;
          if (connectedNodeIds.has(d.id)) return 1.5;
        }
        return 1;
      })
      .attr("stroke", (d) => {
        if (showImpactAnalysis && selectedNode && d.id === selectedNode.id) {
          return IMPACT_HIGHLIGHT_COLOR;
        }
        return "#fff";
      })
      .attr("opacity", (d) => {
        if (showImpactAnalysis && selectedNode) {
          if (d.id === selectedNode.id || connectedNodeIds.has(d.id)) return 1;
          return 0.3;
        }
        return 1;
      });

    mainGroup
      .selectAll(".item text")
      .attr("font-weight", function (d) {
        const parentNode = d3.select(this.parentNode).datum();
        return showImpactAnalysis &&
          selectedNode &&
          (parentNode.id === selectedNode.id ||
            connectedNodeIds.has(parentNode.id))
          ? "bold"
          : "normal";
      })
      .attr("fill", function (d) {
        const parentNode = d3.select(this.parentNode).datum();
        return showImpactAnalysis &&
          selectedNode &&
          parentNode.id === selectedNode.id
          ? IMPACT_HIGHLIGHT_COLOR
          : "#e0e0e0";
      });
  }

  // Drag functions for columns
  function dragStartedColumn(event, d) {
    d3.select(this).raise();
  }

  function draggedColumn(event, d) {
    const dx = event.dx;
    d3.select(this).attr("transform", function () {
      const currentTransform = d3.select(this).attr("transform");
      const currentX = parseFloat(currentTransform.split("(")[1].split(",")[0]);
      const newX = currentX + dx;
      return `translate(${newX}, 0)`;
    });

    nodesBySystem[d].forEach((node) => {
      node.leftX += dx;
      node.rightX += dx;
    });

    renderLinks();
  }

  function dragEndedColumn(event, d) {}

  renderLinks();
};

export default RenderLineageGraph;
