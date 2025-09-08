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
 components: {
  MuiIconButton: {
   styleOverrides: {
    root: {
     borderRadius: 8,
     padding: 6,
     '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
     },
    },
   },
  },
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
