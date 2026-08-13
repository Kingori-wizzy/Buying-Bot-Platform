/**
 * Shared design tokens for web/admin (ADR-0007).
 * Apps map these to CSS custom properties. Keep business composites in apps.
 */

export interface DesignTokens {
  readonly color: {
    readonly background: string;
    readonly foreground: string;
    readonly muted: string;
    readonly surface: string;
    readonly border: string;
    readonly accent: string;
    readonly accentForeground: string;
    readonly danger: string;
    readonly success: string;
    readonly warning: string;
    readonly hero: string;
  };
  readonly space: {
    readonly xs: string;
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
    readonly xl: string;
  };
  readonly radius: {
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
  };
  readonly fontFamily: {
    readonly sans: string;
    readonly display: string;
  };
}

/** Cool graphite + teal commerce palette (Kenya-ready, AI-native). */
export const defaultTokens: DesignTokens = {
  color: {
    background: '#eef2f6',
    foreground: '#0b1220',
    muted: '#5b6777',
    surface: '#ffffff',
    border: '#cfd8e3',
    accent: '#0f766e',
    accentForeground: '#f0fdfa',
    danger: '#b42318',
    success: '#067647',
    warning: '#b54708',
    hero: '#07131f',
  },
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2.5rem',
  },
  radius: {
    sm: '0.35rem',
    md: '0.65rem',
    lg: '1rem',
  },
  fontFamily: {
    sans: '"DM Sans", "Segoe UI", sans-serif',
    display: '"Syne", "DM Sans", sans-serif',
  },
};

export const adminTokens: DesignTokens = {
  ...defaultTokens,
  color: {
    ...defaultTokens.color,
    background: '#0b1017',
    foreground: '#e8eef6',
    muted: '#93a0b0',
    surface: '#121925',
    border: '#243041',
    accent: '#14b8a6',
    accentForeground: '#042f2e',
    hero: '#020617',
  },
};
