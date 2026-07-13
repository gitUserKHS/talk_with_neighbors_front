import { alpha, createTheme } from '@mui/material/styles';

const coral = '#E85C4A';
const mint = '#238579';
const ink = '#29211F';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: coral,
      dark: '#C84335',
      light: '#F39182',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: mint,
      dark: '#17665E',
      light: '#6FB7AD',
    },
    background: {
      default: '#FFF9F5',
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
    borderRadius: 16,
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
          backgroundImage:
            'radial-gradient(circle at 10% 0%, rgba(232, 92, 74, 0.08), transparent 28rem), radial-gradient(circle at 100% 20%, rgba(35, 133, 121, 0.08), transparent 26rem)',
          backgroundAttachment: 'fixed',
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
          boxShadow: `0 10px 24px ${alpha(coral, 0.24)}`,
          '&:hover': {
            boxShadow: `0 12px 28px ${alpha(coral, 0.32)}`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #EEE4DE',
          boxShadow: '0 14px 42px rgba(77, 48, 40, 0.07)',
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
