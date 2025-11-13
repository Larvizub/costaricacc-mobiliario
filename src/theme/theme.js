import { createTheme } from "@mui/material/styles";

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: "#00830e"
    },
    secondary: {
      main: "#333"
    }
  },
  typography: {
    // Establecer una tipografía moderna consistente
    fontFamily: "Inter, sans-serif",
    h4: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      letterSpacing: '0.01em',
    },
    h5: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
    }
  }
});

const theme = createTheme(getDesignTokens(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

export default theme;
