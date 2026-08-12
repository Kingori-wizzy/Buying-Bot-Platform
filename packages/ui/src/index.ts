/**
 * Framework-agnostic UI tokens until a frontend framework ADR is accepted.
 * Do not introduce React/Vue components here before that ADR.
 */

export interface DesignTokens {
  readonly color: {
    readonly background: string;
    readonly foreground: string;
    readonly accent: string;
    readonly danger: string;
  };
  readonly space: {
    readonly xs: string;
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
  };
  readonly radius: {
    readonly sm: string;
    readonly md: string;
  };
  readonly fontFamily: {
    readonly sans: string;
    readonly display: string;
  };
}

export const defaultTokens: DesignTokens = {
  color: {
    background: '#0f1419',
    foreground: '#f4f7fb',
    accent: '#2f6fed',
    danger: '#d64545',
  },
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
  },
  fontFamily: {
    sans: '"IBM Plex Sans", "Segoe UI", sans-serif',
    display: '"IBM Plex Sans", "Segoe UI", sans-serif',
  },
};
