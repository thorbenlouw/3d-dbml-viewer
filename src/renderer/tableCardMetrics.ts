import type { ParsedTable } from '@/types';
import {
  BADGE_GAP,
  BADGE_WIDTH,
  CARD_COLUMN_GAP,
  CARD_DEPTH,
  CARD_HEADER_HEIGHT,
  CARD_HORIZONTAL_PADDING,
  CARD_MAX_WIDTH,
  CARD_MIN_WIDTH,
  CARD_ROW_HEIGHT,
  CARD_VERTICAL_PADDING,
} from './constants';

export interface TableCardDimensions {
  width: number;
  height: number;
  depth: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateTextWidth(text: string): number {
  return text.length * 0.065;
}

export function estimateTableCardDimensions(table: ParsedTable): TableCardDimensions {
  const maxNameWidth = Math.max(
    ...table.columns.map((column) => estimateTextWidth(column.name)),
    0,
  );
  const maxTypeWidth = Math.max(
    ...table.columns.map((column) => estimateTextWidth(column.type)),
    0,
  );
  const badgeWidth = BADGE_WIDTH * 4 + BADGE_GAP * 3;
  const innerWidth =
    Math.max(
      estimateTextWidth(table.name),
      maxNameWidth + CARD_COLUMN_GAP + maxTypeWidth + CARD_COLUMN_GAP + badgeWidth,
    ) +
    CARD_HORIZONTAL_PADDING * 2;

  const width = clamp(innerWidth, CARD_MIN_WIDTH, CARD_MAX_WIDTH);
  const rowCount = Math.max(1, table.columns.length);
  const bodyHeight = rowCount * CARD_ROW_HEIGHT + CARD_VERTICAL_PADDING * 2;

  return {
    width,
    height: CARD_HEADER_HEIGHT + bodyHeight,
    depth: CARD_DEPTH,
  };
}
