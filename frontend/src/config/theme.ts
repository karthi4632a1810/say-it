import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4F46E5' },
    secondary: { main: '#0EA5E9' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
  },
  shape: { borderRadius: 10 },
});
