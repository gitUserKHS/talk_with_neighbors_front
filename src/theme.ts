import { alpha, createTheme, Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

const coral = '#C84335';
const coralAccent = '#E85C4A';
const mint = '#238579';
const ink = '#29211F';

// 어두운 배경에서는 산호색 원본이 충분히 밝지 않아 본문 대비가 떨어진다.
// 어두운 테마에서는 한 단계 밝은 색을 주조색으로 쓴다.
const coralOnDark = '#FF8A75';
const mintOnDark = '#5FC2B1';

const lightPalette = {
  mode: 'light' as const,
  primary: { main: coral, dark: '#A73329', light: coralAccent, contrastText: '#FFFFFF' },
  secondary: { main: mint, dark: '#17665E', light: '#6FB7AD' },
  background: { default: '#F7F8F7', paper: '#FFFFFF' },
  text: { primary: ink, secondary: '#716765' },
  divider: '#EEE4DE',
  success: { main: '#31866F' },
};

const darkPalette = {
  mode: 'dark' as const,
  primary: { main: coralOnDark, dark: coralAccent, light: '#FFB3A3', contrastText: '#2A1512' },
  secondary: { main: mintOnDark, dark: mint, light: '#8FD8CA' },
  background: { default: '#14110F', paper: '#1D1917' },
  text: { primary: '#F3EDEA', secondary: '#B3A8A3' },
  divider: '#332C29',
  success: { main: '#5FC2B1' },
};

export const createAppTheme = (mode: ThemeMode): Theme => {
  const isDark = mode === 'dark';
  const palette = isDark ? darkPalette : lightPalette;
  const accent = palette.primary.main;

  return createTheme({
    palette,
    shape: {
      borderRadius: 14,
    },
    typography: {
      fontFamily: [
        'Pretendard',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Noto Sans KR"',
        '"Segoe UI"',
        'sans-serif',
      ].join(','),
      h1: { fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.08 },
      h2: { fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.12 },
      h3: { fontWeight: 850, letterSpacing: '-0.035em', lineHeight: 1.18 },
      h4: { fontWeight: 850, letterSpacing: '-0.03em' },
      h5: { fontWeight: 800, letterSpacing: '-0.025em' },
      h6: { fontWeight: 800, letterSpacing: '-0.02em' },
      button: { fontWeight: 800, letterSpacing: '-0.01em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.background.default,
            '@media (max-width: 1199.95px)': {
              paddingBottom: 'calc(58px + env(safe-area-inset-bottom))',
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            minHeight: 42,
            paddingInline: 18,
          },
          containedPrimary: {
            boxShadow: `0 6px 16px ${alpha(accent, isDark ? 0.28 : 0.18)}`,
            '&:hover': {
              boxShadow: `0 8px 20px ${alpha(accent, isDark ? 0.36 : 0.24)}`,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${palette.divider}`,
            boxShadow: isDark
              ? '0 4px 18px rgba(0, 0, 0, 0.38)'
              : '0 4px 18px rgba(41, 33, 31, 0.045)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#241F1D' : '#FFFCFA',
            borderRadius: 12,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(accent, 0.55),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            borderRadius: 10,
          },
        },
      },
    },
  });
};

/** 밝은 테마. 테마 모드를 구독하지 않는 곳에서 쓰던 기존 export를 유지한다. */
const theme = createAppTheme('light');

export { theme };
