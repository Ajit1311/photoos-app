export const colors = {
  // Canonical PhotoOS Website Color Palette (photoos.in)
  primary: "#0A3F61", // PhotoOS Deep Brand Navy
  primaryDark: "#061826", // PhotoOS Dark Navy
  primarySoft: "#EAF4FB", // Soft Ice Navy tint
  brandNavy: "#0A3F61",
  brandNavyDark: "#061826",
  blue: "#1F70B8",
  teal: "#3495A1", // PhotoOS Accent Teal / Cyan
  orange: "#EF8619", // PhotoOS Vibrant Orange / Gold
  orangeLight: "#FF9D3B",
  indigo: "#3B82F6",
  purple: "#8B5CF6",
  pink: "#EC4899",
  green: "#10B981",

  // Premium PhotoOS Surfaces
  background: "#F8FAFC", // Clean slate light canvas
  surface: "#FFFFFF",
  surfaceSoft: "#F1F5F9",
  surfaceSecondary: "#E2E8F0",
  card: "#FFFFFF",

  // Typography
  text: "#0F172A", // Slate 900
  textSecondary: "#475569", // Slate 600
  textMuted: "#94A3B8", // Slate 400

  // Semantic borders & indicators
  border: "#E2E8F0",
  borderSubtle: "rgba(10, 63, 97, 0.08)",
  success: "#10B981",
  warning: "#EF8619",
  danger: "#EF4444",

  white: "#FFFFFF",
  black: "#000000",
} as const;

export type AppColor = keyof typeof colors;
