import { cb } from "../lib/coinbase-theme";

export const COLUMN_WIDTH = 220;
export const COLUMN_PADDING = 60;
export const HEADER_HEIGHT = 40;
export const LIST_ITEM_HEIGHT = 30;
export const LIST_ITEM_PADDING = 8;
export const SCHEMA_HEADER_HEIGHT = 20;

export const COLOR_SCALE_RANGE = [
  cb.primary,
  cb.semanticUp,
  "#3d7eff",
  cb.accentYellow,
  "#6b8cff",
  cb.semanticDown,
  "#4a9eff",
  "#8aa8ff",
  cb.muted,
  "#2d6bff",
  cb.body,
  "#5c7cfa",
  cb.mutedSoft,
  "#7090ff",
  "#94a8ff",
  "#b0c0ff",
  cb.hairline,
  cb.onDarkSoft,
];

export const TRANSFORMATION_COLORS = {
  JOIN: cb.primary,
  FILTER: cb.semanticUp,
  AGGREGATE: cb.accentYellow,
  CONCAT: "#3d7eff",
  SUM: cb.semanticUp,
  DIRECT: cb.primary,
  SORT: cb.muted,
  UNION: "#6b8cff",
  DISTINCT: "#4a9eff",
  SUBQUERY: cb.body,
  CASE: "#8aa8ff",
  CAST: cb.mutedSoft,
  MERGE: cb.accentYellow,
  WINDOW: "#3d7eff",
  PIVOT: cb.primary,
  UNPIVOT: cb.muted,
};

export const IMPACT_HIGHLIGHT_COLOR = cb.primary;
export const STANDARD_LINK_OPACITY = 0.35;
export const HIGHLIGHTED_LINK_OPACITY = 1;
