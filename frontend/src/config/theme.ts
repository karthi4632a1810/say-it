import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4F46E5' },
    secondary: { main: '#0EA5E9' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    htmlFontSize: 16,
  },
  shape: { borderRadius: 10 },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        },
        body: {
          overscrollBehaviorY: 'none',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '@media (max-width: 899px)': {
            padding: 10,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          '@media (max-width: 899px)': {
            minHeight: 44,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '@media (max-width: 899px)': {
            minHeight: 48,
          },
        },
      },
    },
  },
});
