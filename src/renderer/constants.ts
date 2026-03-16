export const OPACITY_NEAR = 0.95;
export const OPACITY_FAR = 0.28;
export const DISTANCE_NEAR = 4;
export const DISTANCE_FAR = 18;

export const RESET_TWEEN_DURATION_MS = 600;
export const HOLD_CONTROL_INTERVAL_MS = 16;
export const CONNECTION_SCALE_MIN = 0.1;
export const CONNECTION_SCALE_MAX = 2.4;
export const CONNECTION_SCALE_DEFAULT = 0.4;
export const CONNECTION_SCALE_UNITS_PER_SECOND = 0.9;
export const ZOOM_SCALE_MIN = 0.1;
export const ZOOM_SCALE_MAX = 100;
export const ZOOM_SCALE_DEFAULT = 1;
export const ZOOM_SCALE_UNITS_PER_SECOND = 1.2;

export const CARD_DEPTH = 0.14;
export const CARD_HEADER_HEIGHT = 0.28;
export const CARD_ROW_HEIGHT = 0.2;
export const CARD_VERTICAL_PADDING = 0.08;
export const CARD_HORIZONTAL_PADDING = 0.12;
export const CARD_MIN_WIDTH = 2.2;
export const CARD_MAX_WIDTH = 4.3;
export const CARD_COLUMN_GAP = 0.12;

export const TEXT_HEADER_SIZE = 0.12;
export const TEXT_ROW_SIZE = 0.1;
export const TEXT_BADGE_SIZE = 0.065;

export const BADGE_WIDTH = 0.22;
export const BADGE_HEIGHT = 0.11;
export const BADGE_GAP = 0.04;

export const LINK_DEPTH_LIFT = 0.8;
export const LINK_DEPTH_LIFT_PER_PARALLEL = 0.18;
export const LINK_ENDPOINT_FANOUT_OFFSET = 0.2;
export const LINK_CURVE_TENSION = 0.35;
export const LINK_SEGMENTS = 28;

export const SCENE_BG_COLOR = '#080F1C';
export const CARD_BODY_COLOR = '#0F2336';
export const CARD_HEADER_COLOR = '#1565C0';
export const CARD_EDGE_COLOR = '#29B6F6';
export const CARD_ROW_ODD_COLOR = '#132D47';
export const CARD_ROW_EVEN_COLOR = '#193656';
export const TEXT_COLOR = '#E8F4FD';
export const BADGE_BG_COLOR = '#243040';
export const BADGE_TEXT_COLOR = '#E8F4FD';
export const NOTE_BADGE_TEXT_COLOR = '#E8F4FD';
export const LINK_COLOR = '#29B6F6';
export const LINK_HIGHLIGHT_COLOR = '#FFA726';
export const COLUMN_HIGHLIGHT_COLOR = '#FFA726';
export const LINK_TUBE_RADIUS = 0.012;
export const LINK_TUBE_RADIAL_SEGMENTS = 8;

export const PANEL_BG_COLOR = 'rgba(8, 15, 28, 0.92)';
export const PANEL_TEXT_COLOR = '#F8FAFC';
export const PANEL_ACCENT_COLOR = '#FFA726';
export const PANEL_BORDER_COLOR = 'rgba(100, 150, 200, 0.30)';

export const SCENE_FONT_REGULAR = '/fonts/Inter-Regular.ttf';
export const SCENE_FONT_BOLD = '/fonts/Inter-Bold.ttf';

export const TITLE_SCALE_MAX = 2.5;
export const FLY_TO_DISTANCE = 5;
export const BASE_LINK_DISTANCE = 1.5;
export const STICKY_LINK_DISTANCE_MULTIPLIER = 0.65;
export const NON_STICKY_LINK_DISTANCE_MULTIPLIER = 1.12;

export const STICKY_BORDER_COLOR = '#FFA726';
export const STICKY_BORDER_GLOW_OPACITY = 0.75;

// Hop-based opacity constants — used when a sticky table is active.
// HOP_OPACITY_0 / _1 keep the focal cluster fully visible;
// _2 and _FAR progressively dim distant tables.
export const HOP_OPACITY_0 = 0.95; // sticky table itself
export const HOP_OPACITY_1 = 0.95; // direct neighbours (1 hop)
export const HOP_OPACITY_2 = 0.5; // 2 hops away
export const HOP_OPACITY_FAR = 0.1; // 3+ hops away
export const HOP_OPACITY_LERP_SPEED = 0.08; // per-frame lerp factor for smooth transitions

export const NOTE_ICON_CHAR = '✎';
export const NOTE_ICON_SIZE = 0.065;
export const NOTE_HIGHLIGHT_COLOR = PANEL_ACCENT_COLOR;
export const NOTE_PANEL_MAX_WIDTH = 3.0;
export const NOTE_PANEL_MAX_HEIGHT = 2.5;
export const NOTE_PANEL_PADDING = 0.12;
export const NOTE_PANEL_OFFSET = 1.8;
export const NOTE_CONNECTOR_COLOR = '#FFA726';
export const NOTE_CONNECTOR_LINE_WIDTH = 1.5;

export const FOCUS_MARKER_COLOR = '#FFA726';
export const FOCUS_MARKER_OUTER_RADIUS = 0.2;
export const FOCUS_MARKER_RING_THICKNESS = 0.145;
export const FOCUS_MARKER_CENTER_RADIUS = 0.045;
export const FOCUS_MARKER_CROSS_LENGTH = 0.28;
export const FOCUS_MARKER_CROSS_THICKNESS = 0.02;
export const FOCUS_MARKER_Z_OFFSET = 0.018;
export const FOCUS_MARKER_PLACEMENT_PLANE_Z = 0;
export const FOCUS_MARKER_BASE_DIAMETER = FOCUS_MARKER_CROSS_LENGTH;
export const FOCUS_MARKER_MIN_SCREEN_PX = 30;
