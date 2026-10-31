export const typography = {
  fontFamily: {
    system:
      "-apple-system, BlinkMacSystemFont, SF Pro Display, SF Pro Text, system-ui, sans-serif",
  },

  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700" as const,
    letterSpacing: -0.9,
  },

  largeTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600" as const,
    letterSpacing: -0.75,
  },

  title1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600" as const,
    letterSpacing: -0.6,
  },

  title2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600" as const,
    letterSpacing: -0.4,
  },

  title3: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },

  // Backward-compatible aliases used by existing screens
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600" as const,
    letterSpacing: -0.75,
  },

  h3: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },

  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
    letterSpacing: 0.1,
  },

  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },

  bodyMedium: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "500" as const,
    letterSpacing: -0.1,
  },

  callout: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },

  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: -0.1,
  },

  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 0.12,
  },

  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
    letterSpacing: 0.1,
  },

  micro: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500" as const,
    letterSpacing: 0.11,
  },
} as const;

export type TypographyStyle = keyof typeof typography;
