import * as d3 from "d3";
import { cb, coinbase } from "../lib/coinbase-theme";
import {
  COLOR_SCALE_RANGE,
  TRANSFORMATION_COLORS,
  IMPACT_HIGHLIGHT_COLOR,
  STANDARD_LINK_OPACITY,
  HIGHLIGHTED_LINK_OPACITY,
} from "./constants";

const FONT_SANS = coinbase.font.sans;
const FONT_MONO = coinbase.font.mono;

const RenderLineageGraph = ({
  svgRef,
  data,
  showImpactAnalysis,
  selectedNode,
  setSelectedNode,
  onNodeAnalyze,
  columnWidth,
  columnPadding,
  headerHeight,
  listItemHeight,
  listItemPadding,
}) => {
  d3.select(svgRef.current).selectAll("*").remove();

  const width = 1000;
  const height = 800;

  const svg = d3
    .select(svgRef.current)
    .attr("width", width)
    .attr("height", height);
  const mainGroup = svg.append("g");

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", (event) => {
      mainGroup.attr("transform", event.transform);
    });
  svg.call(zoom);

  const initialTransform = d3.zoomIdentity.translate(50, 50);
  svg.call(zoom.transform, initialTransform);

  const nodesBySystem = {};
  data.nodes.forEach((node) => {
    if (!nodesBySystem[node.system]) {
      nodesBySystem[node.system] = [];
    }
    nodesBySystem[node.system].push(node);
  });

  const systems = Object.keys(nodesBySystem);
  const colorScale = d3.scaleOrdinal().domain(systems).range(COLOR_SCALE_RANGE);

  const defs = mainGroup.append("defs");

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
    .attr("refX", (d) => (d.includes("left") ? 0 : 25))
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", (d) => (d.includes("left") ? "auto-start-reverse" : "auto"))
    .append("path")
    .attr("d", "M0,-4L8,0L0,4L2,0Z")
    .attr("fill", (d) =>
      d.includes("highlighted") ? IMPACT_HIGHLIGHT_COLOR : cb.mutedSoft
    )
    .attr("opacity", (d) => (d.includes("highlighted") ? 1 : 0.7));

  const linksLayer = mainGroup.append("g").attr("class", "links-layer");
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

  column
    .append("rect")
    .attr("class", "column-backdrop")
    .attr("width", columnWidth)
    .attr("height", (d) => {
      const contentHeight =
        nodesBySystem[d].length * (listItemHeight + listItemPadding) + 20;
      return headerHeight + 8 + contentHeight;
    })
    .attr("rx", coinbase.radius.md)
    .attr("ry", coinbase.radius.md)
    .attr("fill", cb.surfaceDarkElevated)
    .attr("opacity", 1);

  column
    .append("line")
    .attr("class", "column-divider")
    .attr("x1", 12)
    .attr("x2", columnWidth - 12)
    .attr("y1", headerHeight + 4)
    .attr("y2", headerHeight + 4)
    .attr("stroke", "rgba(255,255,255,0.08)")
    .attr("stroke-width", 1);

  column
    .append("circle")
    .attr("cx", 18)
    .attr("cy", headerHeight / 2)
    .attr("r", 6)
    .attr("fill", (d) => colorScale(d));

  column
    .append("text")
    .attr("x", 32)
    .attr("y", headerHeight / 2)
    .attr("dominant-baseline", "central")
    .attr("fill", cb.onDark)
    .style("font-family", FONT_SANS)
    .style("font-size", "14px")
    .style("font-weight", "600")
    .text((d) => d);

  systems.forEach((system, systemIndex) => {
    const systemNodes = nodesBySystem[system];
    const col = column.filter((d) => d === system);
    const items = col
      .append("g")
      .attr("class", "items")
      .attr("transform", `translate(0, ${headerHeight + 18})`);

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
          const newNode = selectedNode && selectedNode.id === d.id ? null : d;
          setSelectedNode(newNode);
        }
      });

    item
      .append("rect")
      .attr("class", "item-bg")
      .attr("width", columnWidth - 20)
      .attr("height", listItemHeight)
      .attr("rx", coinbase.radius.sm)
      .attr("ry", coinbase.radius.sm)
      .attr("fill", cb.primary)
      .attr("fill-opacity", 0)
      .attr("opacity", 0)
      .style("cursor", "pointer")
      .style("transition", "all 0.2s ease")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("fill", cb.primary)
          .attr("fill-opacity", 0.12);
        if (showImpactAnalysis) {
          const parentG = d3.select(this.parentNode);
          parentG.select(".impact-tooltip").attr("opacity", 1);
        }
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0);
        const parentG = d3.select(this.parentNode);
        parentG.select(".impact-tooltip").attr("opacity", 0);
      });

    if (showImpactAnalysis) {
      const tooltip = item.append("g")
        .attr("class", "impact-tooltip")
        .attr("opacity", 0)
        .attr("pointer-events", "none");

      tooltip.append("rect")
        .attr("x", columnWidth - 108)
        .attr("y", listItemHeight / 2 - 11)
        .attr("width", 98)
        .attr("height", 22)
        .attr("rx", 11)
        .attr("fill", IMPACT_HIGHLIGHT_COLOR);

      tooltip.append("text")
        .attr("x", columnWidth - 59)
        .attr("y", listItemHeight / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .style("font-family", FONT_SANS)
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("fill", cb.onPrimary)
        .text("Analyze");
    }

    item
      .append("circle")
      .attr("class", (d) => `node-circle node-${d.id}-left`)
      .attr("cx", 12)
      .attr("cy", listItemHeight / 2)
      .attr("r", 5)
      .attr("fill", (d) => colorScale(d.system))
      .attr("stroke", cb.surfaceDark)
      .attr("stroke-width", 2);

    item
      .append("circle")
      .attr("class", (d) => `node-circle node-${d.id}-right`)
      .attr("cx", columnWidth - 27)
      .attr("cy", listItemHeight / 2)
      .attr("r", 5)
      .attr("fill", (d) => colorScale(d.system))
      .attr("stroke", cb.surfaceDark)
      .attr("stroke-width", 2);

    item
      .append("text")
      .attr("x", 24)
      .attr("y", listItemHeight / 2)
      .attr("dominant-baseline", "central")
      .attr("fill", cb.onDark)
      .style("font-family", FONT_SANS)
      .attr("font-size", "13px")
      .attr("font-weight", "400")
      .text((d) => d.attribute);

    systemNodes.forEach((node, i) => {
      node.leftX = systemIndex * (columnWidth + columnPadding) + 12;
      node.rightX =
        systemIndex * (columnWidth + columnPadding) + (columnWidth - 17);
      node.y =
        headerHeight +
        18 +
        i * (listItemHeight + listItemPadding) +
        listItemHeight / 2;
      node.parentSystem = system;
    });
  });

  function renderLinks() {
    linksLayer.selectAll(".links").remove();
    linksLayer.selectAll(".link-labels").remove();

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

    const linksGroup = linksLayer.append("g").attr("class", "links");
    const linksToDisplay =
      showImpactAnalysis && selectedNode ? directConnectionLinks : data.links;
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

        if (!targetNode) return "";

        const offset = (i % 10) * 5 - 25;
        let sourceX, sourceY, targetX, targetY;
        let isReverseDirection = false;

        if (!sourceNode) {
          const firstSystemIndex = 0;
          sourceX = firstSystemIndex * (columnWidth + columnPadding) - 50;
          sourceY = targetNode.y;
          targetX = targetNode.leftX;
          targetY = targetNode.y;
        } else {
          const sourceSystem = systems.indexOf(sourceNode.parentSystem);
          const targetSystem = systems.indexOf(targetNode.parentSystem);

          isReverseDirection = targetSystem < sourceSystem;

          if (isReverseDirection) {
            sourceX = sourceNode.leftX;
            sourceY = sourceNode.y;
            targetX = targetNode.rightX;
            targetY = targetNode.y;
          } else {
            sourceX = sourceNode.rightX;
            sourceY = sourceNode.y;
            targetX = targetNode.leftX;
            targetY = targetNode.y;
          }
        }

        if (sourceNode && sourceNode.parentSystem === targetNode.parentSystem) {
          const columnIndex = systems.indexOf(sourceNode.parentSystem);
          const centerX =
            columnIndex * (columnWidth + columnPadding) + columnWidth / 2;
          const controlX = centerX + 70 + offset;
          return `M${sourceX},${sourceY} C${controlX},${sourceY} ${controlX},${targetY} ${targetX},${targetY}`;
        }

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
        showImpactAnalysis && selectedNode ? 2.5 : 1.5
      )
      .attr("stroke-opacity", (d) =>
        showImpactAnalysis && selectedNode
          ? HIGHLIGHTED_LINK_OPACITY
          : STANDARD_LINK_OPACITY
      )
      .attr("stroke-linecap", "round")
      .attr("marker-end", (d) => {
        const sourceNode = data.nodes.find(
          (node) => node.id === (d.source.id || d.source)
        );
        const targetNode = data.nodes.find(
          (node) => node.id === (d.target.id || d.target)
        );

        if (!sourceNode || !targetNode) return "url(#arrow-right)";

        const sourceSystem = systems.indexOf(sourceNode.parentSystem);
        const targetSystem = systems.indexOf(targetNode.parentSystem);

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

    const linkLabels = linksLayer
      .append("g")
      .attr("class", "link-labels")
      .selectAll("g")
      .data(deduplicatedLinks)
      .enter()
      .append("g")
      .attr("opacity", showImpactAnalysis && selectedNode ? 1 : 0);

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
        const sourceSystem = systems.indexOf(sourceNode.parentSystem);
        const targetSystem = systems.indexOf(targetNode.parentSystem);

        isReverseDirection = targetSystem < sourceSystem;

        if (isReverseDirection) {
          sourceX = sourceNode.leftX;
          sourceY = sourceNode.y;
          targetX = targetNode.rightX;
          targetY = targetNode.y;
        } else {
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

      const badgeWidth = Math.max(d.transformationType.length * 6.5 + 20, 72);
      const badgeFill = isDirectConnection ? IMPACT_HIGHLIGHT_COLOR : cb.surfaceStrong;
      const badgeText = isDirectConnection ? cb.onPrimary : cb.ink;

      d3.select(this)
        .append("rect")
        .attr("x", x - badgeWidth / 2)
        .attr("y", y - 12)
        .attr("width", badgeWidth)
        .attr("height", 24)
        .attr("rx", 12)
        .attr("ry", 12)
        .attr("fill", badgeFill)
        .attr("stroke", isDirectConnection ? "none" : cb.hairline)
        .attr("stroke-width", 1);

      d3.select(this)
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .style("font-family", FONT_SANS)
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("fill", badgeText)
        .text(d.transformationType);
    });

    mainGroup
      .selectAll(".node-circle")
      .transition()
      .duration(300)
      .ease(d3.easeCubicOut)
      .attr("r", (d) => {
        if (showImpactAnalysis && selectedNode) {
          if (d.id === selectedNode.id) return 8;
          if (connectedNodeIds.has(d.id)) return 6;
          return 5;
        }
        return 5;
      })
      .attr("stroke-width", (d) => {
        if (showImpactAnalysis && selectedNode) {
          if (d.id === selectedNode.id) return 3;
          if (connectedNodeIds.has(d.id)) return 2;
        }
        return 2;
      })
      .attr("stroke", (d) => {
        if (showImpactAnalysis && selectedNode && d.id === selectedNode.id) {
          return IMPACT_HIGHLIGHT_COLOR;
        }
        return cb.surfaceDark;
      })
      .attr("opacity", (d) => {
        if (showImpactAnalysis && selectedNode) {
          if (d.id === selectedNode.id || connectedNodeIds.has(d.id)) return 1;
          return 0.3;
        }
        return 1;
      });

    mainGroup.selectAll(".pulse-ring").remove();
    if (showImpactAnalysis && selectedNode) {
      mainGroup.selectAll(".node-circle").each(function (d) {
        if (d.id === selectedNode.id) {
          const circle = d3.select(this);
          const cx = parseFloat(circle.attr("cx"));
          const cy = parseFloat(circle.attr("cy"));
          const parentTransform = d3.select(this.parentNode).attr("transform");
          const grandParentTransform = d3.select(this.parentNode.parentNode).attr("transform");
          const colTransform = d3.select(this.parentNode.parentNode.parentNode).attr("transform");

          const pulseGroup = mainGroup.append("g").attr("class", "pulse-ring");
          if (colTransform) pulseGroup.attr("transform", colTransform);

          const innerG = pulseGroup.append("g");
          if (grandParentTransform) innerG.attr("transform", grandParentTransform);

          const innerG2 = innerG.append("g");
          if (parentTransform) innerG2.attr("transform", parentTransform);

          innerG2.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", 8)
            .attr("fill", "none")
            .attr("stroke", IMPACT_HIGHLIGHT_COLOR)
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.6)
            .append("animate")
            .attr("attributeName", "r")
            .attr("values", "8;14;8")
            .attr("dur", "2s")
            .attr("repeatCount", "indefinite");

          innerG2.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", 8)
            .attr("fill", "none")
            .attr("stroke", IMPACT_HIGHLIGHT_COLOR)
            .attr("stroke-width", 1)
            .attr("stroke-opacity", 0.3)
            .append("animate")
            .attr("attributeName", "r")
            .attr("values", "10;18;10")
            .attr("dur", "2s")
            .attr("repeatCount", "indefinite");
        }
      });
    }

    mainGroup
      .selectAll(".item text")
      .transition()
      .duration(300)
      .ease(d3.easeCubicOut)
      .attr("font-weight", function (d) {
        const parentNode = d3.select(this.parentNode).datum();
        return showImpactAnalysis &&
          selectedNode &&
          (parentNode.id === selectedNode.id ||
            connectedNodeIds.has(parentNode.id))
          ? "600"
          : "500";
      })
      .attr("fill", function (d) {
        const parentNode = d3.select(this.parentNode).datum();
        if (showImpactAnalysis && selectedNode) {
          if (parentNode.id === selectedNode.id) {
            return IMPACT_HIGHLIGHT_COLOR;
          }
          if (connectedNodeIds.has(parentNode.id)) {
            return cb.onDark;
          }
          return cb.onDarkSoft;
        }
        return cb.onDark;
      });

    linksLayer.lower();
    columns.raise();
    mainGroup.selectAll(".pulse-ring").raise();
  }

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
