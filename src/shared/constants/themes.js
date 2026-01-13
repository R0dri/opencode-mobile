import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONTS } from './ui';

// Light theme colors
const lightColors = {
  background: '#ffffff',
  surface: '#f8f9fa',
  surfaceSecondary: '#e9ecef',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#dee2e6',
  borderLight: '#f8f9fa',
  accent: '#007bff',
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
  statusBarStyle: 'dark', // dark text on light background

  // Status indicator colors
  statusConnected: '#4CAF50',
  statusConnecting: '#2196F3',
  statusReachable: '#FF9800',
  statusUnreachable: '#F44336',
  statusUnknown: '#9E9E9E',

  // State background colors
  errorBackground: '#ffebee',
  successBackground: '#e8f5e8',
  warningBackground: '#fff8e1',

  // Glass Theme Tokens (Liquid Glass)
  glassBackground: 'rgba(255, 255, 255, 0.65)',
  glassSurface: 'rgba(255, 255, 255, 0.45)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  glassHighlight: 'rgba(255, 255, 255, 0.8)',
  glassShadow: 'rgba(0, 0, 0, 0.1)',
  glassText: '#000000',
  blurIntensity: 30,

  // Additional text colors
  errorText: '#d32f2f',
  warningText: '#856404',
  accentSecondary: '#1976d2',

  // Shadow color
  shadowColor: '#000000',
};

// Dark theme colors - fully black like opencode
const darkColors = {
  background: '#000000',
  surface: '#1a1a1a',
  surfaceSecondary: '#2a2a2a',
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  border: '#333333',
  borderLight: '#404040',
  accent: '#007bff',
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
  statusBarStyle: 'light', // light text on dark background

  // Status indicator colors (slightly brighter for dark backgrounds)
  statusConnected: '#66BB6A',
  statusConnecting: '#42A5F5',
  statusReachable: '#FFB74D',
  statusUnreachable: '#EF5350',
  statusUnknown: '#BDBDBD',

  // State background colors (dark-appropriate variants)
  errorBackground: '#3E2723',
  successBackground: '#2E3B32',
  warningBackground: '#3E2E1F',

  // Glass Theme Tokens (Liquid Glass - Dark)
  glassBackground: 'rgba(0, 0, 0, 0.65)',
  glassSurface: 'rgba(30, 30, 30, 0.45)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  glassHighlight: 'rgba(255, 255, 255, 0.2)',
  glassShadow: 'rgba(0, 0, 0, 0.5)',
  glassText: '#ffffff',
  blurIntensity: 30,

  // Additional text colors (adjusted for dark theme)
  errorText: '#FF8A80',
  warningText: '#FFD54F',
  accentSecondary: '#64B5F6',

  // Shadow color (darker for dark theme)
  shadowColor: '#000000',
};

export const lightTheme = {
  colors: lightColors,
  isDark: false,
  spacing: SPACING,
  fontSizes: FONT_SIZES,
  fonts: FONTS,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
};

export const darkTheme = {
  colors: darkColors,
  isDark: true,
  spacing: SPACING,
  fontSizes: FONT_SIZES,
  fonts: FONTS,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
};
