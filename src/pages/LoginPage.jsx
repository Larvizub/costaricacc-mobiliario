import React, { useState } from "react";
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { Box, Button, TextField, Typography, Paper, Tabs, Tab, useTheme } from "@mui/material";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
  // Importar useAuth y usar el contexto para navegación automática
import { useAuth } from "../contexts/AuthContext";



function LoginPage() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Login con Microsoft usando el proveedor oficial de Firebase
  const handleMicrosoftLogin = async () => {
    setError("");
    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({ prompt: 'select_account' });
      // provider.addScope('User.Read'); // Puedes agregar scopes si lo necesitas
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // Guardar en la base de datos si es la primera vez
      const userRef = ref(db, `usuarios/${user.uid}`);
      const snap = await import("firebase/database").then(m => m.get(userRef));
      if (!snap.exists()) {
        await set(userRef, {
          nombre: user.displayName || user.email,
          email: user.email,
          rol: "cliente"
        });
        // También crear en solicitantes para flujo de solicitudes
        const solRef = ref(db, `solicitantes/${user.uid}`);
        await set(solRef, {
          nombre: user.displayName || user.email,
          email: user.email,
          rol: "cliente"
        });
      }
      // La navegación la gestiona el AuthContext
    } catch (e) {
      setError("No se pudo iniciar sesión con Microsoft");
    }
  };

  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirigir a dashboard
    } catch (e) {
      setError("Credenciales incorrectas");
    }
  };

  const handleRegister = async () => {
    if (!nombre || !email || !password || !confirmPassword) {
      setError("Completa todos los campos");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Guardar nombre y correo en la base de datos en la rama usuarios
      await set(ref(db, `usuarios/${cred.user.uid}`), {
        nombre,
        email,
        rol: "cliente" // Por defecto, pero admin puede cambiarlo luego
      });
    } catch (e) {
      setError("Error al registrar usuario");
    }
  };

return (
  <Box sx={{ 
    minHeight: "100vh", 
    bgcolor: theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5', 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center" 
  }}>
    <Paper sx={{ 
      p: 4, 
      minWidth: 350, 
      maxWidth: 400,
      bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : 'background.paper',
      boxShadow: theme.palette.mode === 'dark' 
        ? '0 8px 32px rgba(0,0,0,0.4)' 
        : '0 8px 32px rgba(0,0,0,0.1)',
      border: theme.palette.mode === 'dark' ? '1px solid #333' : 'none'
    }}>
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <img 
          src="https://costaricacc.com/cccr/Logocccr.png" 
          alt="Logo" 
          style={{ 
            height: 90,
            filter: theme.palette.mode === 'dark' ? 'invert(1) brightness(1.8) grayscale(1)' : 'none'
          }} 
        />
        <Typography variant="h5" color="textPrimary" sx={{ fontWeight: 700, mt: 2, letterSpacing: 1 }}>
          Sistema de Gestión de Mobiliario
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ 
            mt: 2, 
            mb: 1,
            bgcolor: '#00830e',
            '&:hover': {
              bgcolor: '#00690b'
            }
          }}
          onClick={handleMicrosoftLogin}
          fullWidth
          startIcon={
            // Logo de Microsoft adaptado al modo
            <svg width="24" height="24" viewBox="0 0 24 24">
              <rect x="1" y="1" width="10" height="10" fill="#fff" />
              <rect x="13" y="1" width="10" height="10" fill="#fff" />
              <rect x="1" y="13" width="10" height="10" fill="#fff" />
              <rect x="13" y="13" width="10" height="10" fill="#fff" />
            </svg>
          }
        >
          Ingresar con cuenta Microsoft
        </Button>
      </Box>
      <Tabs 
        value={tab} 
        onChange={(_, v) => setTab(v)} 
        centered
        sx={{
          '& .MuiTab-root': {
            color: theme.palette.text.primary
          }
        }}
      >
        <Tab label="Iniciar sesión" />
        <Tab label="Registrarse" />
      </Tabs>
      {tab === 0 ? (
        <Box sx={{ mt: 2 }}>
          <TextField label="Correo" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} />
          <TextField label="Contraseña" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <Typography color="error">{error}</Typography>}
          <Button 
            variant="contained" 
            fullWidth 
            sx={{ 
              mt: 2, 
              bgcolor: "#00830e",
              '&:hover': {
                bgcolor: '#00690b'
              }
            }} 
            onClick={handleLogin}
          >
            Ingresar
          </Button>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          <TextField label="Nombre" fullWidth margin="normal" value={nombre} onChange={e => setNombre(e.target.value)} />
          <TextField label="Correo" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} />
          <TextField label="Contraseña" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} />
          <TextField label="Confirmar contraseña" type="password" fullWidth margin="normal" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          {error && <Typography color="error">{error}</Typography>}
          <Button 
            variant="contained" 
            fullWidth 
            sx={{ 
              mt: 2, 
              bgcolor: "#00830e",
              '&:hover': {
                bgcolor: '#00690b'
              }
            }} 
            onClick={handleRegister}
          >
            Registrarse
          </Button>
        </Box>
      )}
      {/* Pie de página solo con logo de Heroica */}
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <img 
          src="https://costaricacc.com/cccr/Logoheroica.png" 
          alt="Logo Heroica" 
          style={{ 
            height: 40, 
            marginTop: 8,
            filter: theme.palette.mode === 'dark' ? 'invert(1) brightness(1.8) grayscale(1)' : 'none'
          }} 
        />
      </Box>
    </Paper>
  </Box>
);
}

export default LoginPage;
