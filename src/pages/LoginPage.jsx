import React, { useState } from "react";
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { Box, Button, TextField, Typography, Paper, Tabs, Tab, useTheme, Avatar, Divider } from "@mui/material";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { Login as LoginIcon, PersonAdd as PersonAddIcon } from "@mui/icons-material";
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
    background: theme.palette.mode === 'dark' 
      ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    p: 2
  }}>
    <Paper sx={{ 
      p: { xs: 3, sm: 4 }, 
      minWidth: { xs: '100%', sm: 400 },
      maxWidth: 440,
      bgcolor: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(10px)',
      borderRadius: 4,
      boxShadow: theme.palette.mode === 'dark' 
        ? '0 20px 60px rgba(0,0,0,0.5)' 
        : '0 20px 60px rgba(0,0,0,0.15)',
      border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none'
    }}>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Avatar 
          sx={{ 
            width: 80, 
            height: 80, 
            mx: 'auto', 
            mb: 2,
            background: 'linear-gradient(135deg, #00830e 0%, #00a819 100%)',
            boxShadow: '0 8px 24px rgba(0, 131, 14, 0.3)'
          }}
        >
          <img 
            src="https://costaricacc.com/cccr/Logocccr.png" 
            alt="Logo" 
            style={{ 
              height: 50,
              filter: 'brightness(0) invert(1)'
            }} 
          />
        </Avatar>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700, 
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #fff 0%, #ccc 100%)'
              : 'linear-gradient(135deg, #333 0%, #666 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}
        >
          Gestión de Mobiliario
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Centro de Convenciones Costa Rica
        </Typography>
      </Box>

      <Button
        variant="contained"
        sx={{ 
          py: 1.5,
          background: 'linear-gradient(135deg, #00830e 0%, #00a819 100%)',
          borderRadius: 3,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0, 131, 14, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #006b0b 0%, #008c15 100%)',
            boxShadow: '0 12px 32px rgba(0, 131, 14, 0.4)',
            transform: 'translateY(-2px)'
          },
          transition: 'all 0.3s ease'
        }}
        onClick={handleMicrosoftLogin}
        fullWidth
        startIcon={
          <svg width="20" height="20" viewBox="0 0 24 24">
            <rect x="1" y="1" width="10" height="10" fill="#fff" />
            <rect x="13" y="1" width="10" height="10" fill="#fff" />
            <rect x="1" y="13" width="10" height="10" fill="#fff" />
            <rect x="13" y="13" width="10" height="10" fill="#fff" />
          </svg>
        }
      >
        Ingresar con Microsoft
      </Button>

      <Divider sx={{ my: 3 }}>
        <Typography variant="caption" color="text.secondary">o usa tu cuenta</Typography>
      </Divider>

      <Tabs 
        value={tab} 
        onChange={(_, v) => setTab(v)} 
        centered
        sx={{
          mb: 2,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            minHeight: 44,
            borderRadius: 2
          },
          '& .Mui-selected': {
            color: '#00830e !important'
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#00830e',
            height: 3,
            borderRadius: 2
          }
        }}
      >
        <Tab icon={<LoginIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Iniciar sesión" />
        <Tab icon={<PersonAddIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Registrarse" />
      </Tabs>

      {tab === 0 ? (
        <Box sx={{ mt: 1 }}>
          <TextField 
            label="Correo electrónico" 
            fullWidth 
            margin="normal" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': { borderColor: '#00830e' },
                '&.Mui-focused fieldset': { borderColor: '#00830e' }
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#00830e' }
            }}
          />
          <TextField 
            label="Contraseña" 
            type="password" 
            fullWidth 
            margin="normal" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': { borderColor: '#00830e' },
                '&.Mui-focused fieldset': { borderColor: '#00830e' }
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#00830e' }
            }}
          />
          {error && (
            <Typography 
              color="error" 
              sx={{ 
                mt: 1, 
                p: 1.5, 
                bgcolor: 'error.light', 
                borderRadius: 2,
                fontSize: '0.875rem',
                color: 'error.dark'
              }}
            >
              {error}
            </Typography>
          )}
          <Button 
            variant="contained" 
            fullWidth 
            sx={{ 
              mt: 3,
              py: 1.5,
              background: 'linear-gradient(135deg, #00830e 0%, #00a819 100%)',
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0, 131, 14, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #006b0b 0%, #008c15 100%)',
                boxShadow: '0 12px 32px rgba(0, 131, 14, 0.4)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s ease'
            }} 
            onClick={handleLogin}
          >
            Ingresar
          </Button>
        </Box>
      ) : (
        <Box sx={{ mt: 1 }}>
          <TextField 
            label="Nombre completo" 
            fullWidth 
            margin="normal" 
            value={nombre} 
            onChange={e => setNombre(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': { borderColor: '#00830e' },
                '&.Mui-focused fieldset': { borderColor: '#00830e' }
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#00830e' }
            }}
          />
          <TextField 
            label="Correo electrónico" 
            fullWidth 
            margin="normal" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': { borderColor: '#00830e' },
                '&.Mui-focused fieldset': { borderColor: '#00830e' }
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#00830e' }
            }}
          />
          <TextField 
            label="Contraseña" 
            type="password" 
            fullWidth 
            margin="normal" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': { borderColor: '#00830e' },
                '&.Mui-focused fieldset': { borderColor: '#00830e' }
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#00830e' }
            }}
          />
          <TextField 
            label="Confirmar contraseña" 
            type="password" 
            fullWidth 
            margin="normal" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': { borderColor: '#00830e' },
                '&.Mui-focused fieldset': { borderColor: '#00830e' }
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#00830e' }
            }}
          />
          {error && (
            <Typography 
              color="error" 
              sx={{ 
                mt: 1, 
                p: 1.5, 
                bgcolor: 'error.light', 
                borderRadius: 2,
                fontSize: '0.875rem',
                color: 'error.dark'
              }}
            >
              {error}
            </Typography>
          )}
          <Button 
            variant="contained" 
            fullWidth 
            sx={{ 
              mt: 3,
              py: 1.5,
              background: 'linear-gradient(135deg, #00830e 0%, #00a819 100%)',
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0, 131, 14, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #006b0b 0%, #008c15 100%)',
                boxShadow: '0 12px 32px rgba(0, 131, 14, 0.4)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s ease'
            }} 
            onClick={handleRegister}
          >
            Crear cuenta
          </Button>
        </Box>
      )}

      {/* Footer con logo Heroica */}
      <Box sx={{ textAlign: "center", mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Desarrollado por
        </Typography>
        <img 
          src="https://costaricacc.com/cccr/Logoheroica.png" 
          alt="Logo Heroica" 
          style={{ 
            height: 36,
            opacity: 1,
            filter: theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
          }} 
        />
      </Box>
    </Paper>
  </Box>
);
}

export default LoginPage;
