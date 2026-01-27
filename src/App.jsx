import React, { useMemo, useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./contexts/AuthContext";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EntregaActivos = lazy(() => import("./pages/EntregaActivos"));
const Solicitud = lazy(() => import("./pages/Solicitud"));
const Inventario = lazy(() => import("./pages/Inventario"));
const Existencias = lazy(() => import(/* @vite-ignore */ "./pages/Existencias"));
const Autorizacion = lazy(() => import("./pages/Autorizacion"));
const Historial = lazy(() => import("./pages/Historial"));
const Categorias = lazy(() => import("./pages/Categorias"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Preferencias = lazy(() => import("./pages/Preferencias"));
const Entregas = lazy(() => import("./pages/Entregas"));
const TiempoCarga = lazy(() => import("./pages/TiempoCarga"));
const Notificaciones = lazy(() => import("./pages/Notificaciones"));
const Reparacion = lazy(() => import("./pages/Reparacion"));
const HistorialRep = lazy(() => import("./pages/HistorialRep"));

function App() {
  const { user, loading } = useAuth();
  
  // Detectar el modo del navegador automáticamente
  const [mode, setMode] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  
  // Escuchar cambios en el modo del navegador
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setMode(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: "#00830e" },
      secondary: { main: "#1976d2" }
    },
    typography: {
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
  }), [mode]);

  const handleToggleTheme = () => {
    setMode(prev => (prev === "light" ? "dark" : "light"));
  };

  if (loading) return null; // O un spinner

  return (
    <ThemeProvider theme={theme}>
      <Suspense fallback={<div>Cargando...</div>}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/*" element={
            user ? (
              <MainLayout onToggleTheme={handleToggleTheme}>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/solicitud" element={<Solicitud />} />
                    <Route path="/inventario" element={<Inventario />} />
                    <Route path="/autorizacion" element={<Autorizacion />} />
                    <Route path="/existencias" element={<Existencias />} />
                    <Route path="/historial" element={<Historial />} />
                    <Route path="/categorias" element={<Categorias />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/entregas" element={<Entregas />} />
                    <Route path="/tiempo-carga" element={<TiempoCarga />} />
                    <Route path="/notificaciones" element={<Notificaciones />} />
                    <Route path="/preferencias" element={<Preferencias />} />
                    <Route path="/reparacion" element={<Reparacion />} />
                    <Route path="/entrega-activos" element={<EntregaActivos />} />
                    <Route path="/historial-rep" element={<HistorialRep />} />
                  </Routes>
                </ErrorBoundary>
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
