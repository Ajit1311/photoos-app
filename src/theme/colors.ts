export const colors = {
  // Canonical PhotoOS + Apple Pro Palette
  primary: "#007AFF", // Apple System Blue accent
  primaryDark: "#0056B3",
  primarySoft: "#EBF5FF",
  brandNavy: "#0A3F61",
  blue: "#007AFF",
  teal: "#30B0C7",
  orange: "#FF9500",
  indigo: "#5856D6",
  purple: "#AF52DE",
  pink: "#FF2D55",
  green: "#34C759",

  // Apple Surfaces
  background: "#F2F2F7", // Apple iOS System Grouped Background
  surface: "#FFFFFF",
  surfaceSoft: "#F2F2F7",
  surfaceSecondary: "#E5E5EA",
  card: "#FFFFFF",

  // Apple Typography
  text: "#000000",
  textSecondary: "#6C6C70", // Apple System Gray (Light mode)
  textMuted: "#8E8E93",

  // Semantic colors
  border: "#E5E5EA", // Apple Hairline / Separator
  borderSubtle: "rgba(60, 60, 67, 0.08)",
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",

  white: "#FFFFFF",
  black: "#000000",
} as const;

export type AppColor = keyof typeof colors;
