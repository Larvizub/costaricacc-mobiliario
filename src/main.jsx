import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline } from "@mui/material";
import { SnackbarProvider } from "notistack";
import { AuthProvider } from "./contexts/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CssBaseline />
    <SnackbarProvider maxSnack={3}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </SnackbarProvider>
  </React.StrictMode>
);

// En desarrollo, desregistrar SW para no interferir con HMR de Vite.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      })
      .catch((err) => console.warn('[sw] No se pudieron limpiar registros en dev:', err));
  } else {
    // Registrar service worker solo en producción para soportar instalación PWA.
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('[sw] ServiceWorker registrado:', reg.scope))
        .catch((err) => console.warn('[sw] Registro ServiceWorker fallido:', err));
    });
  }
}
