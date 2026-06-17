import { useMediaQuery, useTheme } from '@mui/material';

/** True on phones / small tablets (< 900px). */
export function useIsMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
}
