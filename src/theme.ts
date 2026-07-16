import { alpha, createTheme } from '@mui/material/styles';

const coral = '#C84335';
const coralAccent = '#E85C4A';
const mint = '#238579';
const ink = '#29211F';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: coral,
      dark: '#A73329',
      light: coralAccent,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: mint,
      dark: '#17665E',
      light: '#6FB7AD',
    },
    background: {
      default: '#F7F8F7',
      paper: '#FFFFFF',
    },
    text: {
      primary: ink,
      secondary: '#716765',
    },
    divider: '#EEE4DE',
    success: {
      main: '#31866F',
    },
  },
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
          backgroundColor: '#F7F8F7',
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
          boxShadow: `0 6px 16px ${alpha(coral, 0.18)}`,
          '&:hover': {
            boxShadow: `0 8px 20px ${alpha(coral, 0.24)}`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #EEE4DE',
          boxShadow: '0 4px 18px rgba(41, 33, 31, 0.045)',
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
          backgroundColor: '#FFFCFA',
          borderRadius: 12,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(coral, 0.55),
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

export { theme };
