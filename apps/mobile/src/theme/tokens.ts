/**
 * LightBuy UI tokens — build-spec §2 only, no extra palette.
 */
export const tokens = {
  color: {
    primary: '#FF5000',
    primaryPressed: '#E64500',
    primarySoft: '#FFF3EE',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    price: '#FF5000',
    originalPrice: '#999999',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textTertiary: '#999999',
    line: '#EEEEEE',
    disabledText: '#CCCCCC',
    disabledFill: '#F0F0F0',
    success: '#00B42A',
    warning: '#FF7D00',
    error: '#F53F3F',
  },
  radius: {
    input: 8,
    card: 12,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  /** 可点区域最小边长（pt）。 */
  minTouch: 44,
} as const;

export type Tokens = typeof tokens;
