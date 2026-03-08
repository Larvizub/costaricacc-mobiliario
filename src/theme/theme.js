import { createTheme } from "@mui/material/styles";

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: "#00830e"
    },
    secondary: {
      main: "#333"
    },
    ...(mode === "dark"
      ? {
          background: {
            default: "#0b1016",
            paper: "#161d26"
          },
          text: {
            primary: "#e7edf5",
            secondary: "#a7b3c2"
          },
          divider: "rgba(255,255,255,0.12)"
        }
      : {
          background: {
            default: "#f5f6f8",
            paper: "#ffffff"
          }
        })
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
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: mode === "dark" ? "#0b1016" : "#f5f6f8"
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none"
        }
      }
    }
  }
});

const theme = createTheme(getDesignTokens(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

export default theme;
