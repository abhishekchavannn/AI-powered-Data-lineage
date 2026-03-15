export const COLUMN_WIDTH = 220;
export const COLUMN_PADDING = 60;
export const HEADER_HEIGHT = 40;
export const LIST_ITEM_HEIGHT = 30;
export const LIST_ITEM_PADDING = 8;
export const SCHEMA_HEADER_HEIGHT = 20;

export const COLOR_SCALE_RANGE = [
  "#4285F4", // Blue
  "#EA4335", // Red
  "#34A853", // Green
  "#FBBC05", // Yellow
  "#8ab4f8", // Light blue
  "#f28b82", // Light red
  "#ceead6", // Light green
  "#fde293", // Light yellow
  "#a142f4", // Purple
  "#f4b400", // Orange-yellow
  "#00bcd4", // Cyan
  "#ff7043", // Deep orange
  "#9c27b0", // Deep purple
  "#26a69a", // Teal
  "#cddc39", // Lime
  "#e91e63", // Pink
  "#b0bec5", // Blue-grey
  "#607d8b", // Slate
];

export const TRANSFORMATION_COLORS = {
  JOIN: "#4285F4",
  FILTER: "#34A853",
  AGGREGATE: "#FBBC05",
  CONCAT: "#EA4335",
  SUM: "#8ab4f8",
  DIRECT: "#ceead6",
  SORT: "#a142f4", // Purple          -- ORDER BY, window sorts
  UNION: "#f4b400", // Orange-yellow   -- UNION / UNION ALL
  DISTINCT: "#00bcd4", // Cyan            -- SELECT DISTINCT
  SUBQUERY: "#ff7043", // Deep orange     -- Inline / correlated sub-query
  CASE: "#9c27b0", // Deep purple     -- CASE / DECODE logic
  CAST: "#26a69a", // Teal            -- CAST / CONVERT datatype change
  MERGE: "#cddc39", // Lime            -- Oracle MERGE / MySQL INSERT … ON DUPLICATE KEY
  WINDOW: "#e91e63", // Pink            -- Analytic/window functions
  PIVOT: "#b0bec5", // Blue-grey       -- Oracle PIVOT / manual crosstab
  UNPIVOT: "#607d8b", // Slate
};

export const IMPACT_HIGHLIGHT_COLOR = "#4285F4";
export const STANDARD_LINK_OPACITY = 0.3;
export const HIGHLIGHTED_LINK_OPACITY = 0.9;
