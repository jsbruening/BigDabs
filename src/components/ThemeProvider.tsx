"use client";

import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
 palette: {
  primary: {
   main: '#528400', // Your green color
  },
  secondary: {
   main: '#f97316', // Orange color from your design
  },
 },
 typography: {
  fontFamily: 'var(--font-inter), sans-serif',
 },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
 return (
  <MuiThemeProvider theme={theme}>
   <CssBaseline />
   {children}
  </MuiThemeProvider>
 );
}
