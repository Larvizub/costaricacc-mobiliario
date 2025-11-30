import React, { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import {
  Box, Typography, Paper, TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem, Alert, Card, CardContent, Divider, Avatar, Chip
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Palette as PaletteIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from "@mui/icons-material";
import { updateProfile, updateEmail, updatePassword } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";

const temas = [
  { value: "light", label: "Claro", icon: <LightModeIcon /> },
  { value: "dark", label: "Oscuro", icon: <DarkModeIcon /> }
];

function Preferencias() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({ nombre: "", email: "", password: "", confirmPassword: "", tema: "light" });
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        nombre: user.displayName || "",
        email: user.email || "",
        tema: localStorage.getItem("tema") || "light"
      }));
    }
  }, [user]);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (e.target.name === "password" || e.target.name === "confirmPassword") {
      setPasswordError("");
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setPasswordError("");
    setLoading(true);
    try {
      if (!user) throw new Error("No hay usuario autenticado");
      if (form.password && form.password !== form.confirmPassword) {
        setPasswordError("Las contraseñas no coinciden");
        setLoading(false);
        return;
      }
      if (user.displayName !== form.nombre) {
        await updateProfile(user, { displayName: form.nombre });
      }
      if (user.email !== form.email) {
        await updateEmail(user, form.email);
      }
      if (form.password) {
        await updatePassword(user, form.password);
      }
      localStorage.setItem("tema", form.tema);
      enqueueSnackbar("Preferencias actualizadas correctamente.", { variant: "success" });
      setForm(f => ({ ...f, password: "", confirmPassword: "" }));
    } catch (err) {
      enqueueSnackbar("Error al actualizar: " + (err.message || err), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Debes iniciar sesión para ver tus preferencias.</Alert>
      </Box>
    );
  }

  // Estilos compartidos para TextField
  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      '&:hover fieldset': { borderColor: '#00830e' },
      '&.Mui-focused fieldset': { borderColor: '#00830e' }
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#00830e' }
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #00830e, #006400)', 
          borderRadius: 2, 
          p: 1.5, 
          display: 'flex',
          boxShadow: '0 4px 14px rgba(0, 131, 14, 0.3)'
        }}>
          <SettingsIcon sx={{ color: '#fff', fontSize: 36 }} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Preferencias</Typography>
          <Typography variant="body2" color="text.secondary">
            Administra tu perfil y configuración de la cuenta
          </Typography>
        </Box>
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Columna izquierda: Perfil */}
          <Grid item xs={12} md={6}>
            {/* Tarjeta de perfil del usuario */}
            <Card sx={theme => ({ 
              mb: 3,
              borderRadius: 3,
              boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'visible'
            })}>
              <Box sx={{ 
                background: 'linear-gradient(135deg, #00830e 0%, #006400 100%)', 
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: '12px 12px 0 0'
              }}>
                <Avatar sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: 'rgba(255,255,255,0.2)',
                  border: '3px solid rgba(255,255,255,0.5)',
                  fontSize: '2rem',
                  fontWeight: 700,
                  mb: 1
                }}>
                  {form.nombre ? form.nombre.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                  {form.nombre || 'Usuario'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {form.email}
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PersonIcon sx={{ color: '#00830e' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Información Personal
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField 
                      label="Nombre completo" 
                      name="nombre" 
                      value={form.nombre} 
                      onChange={handleChange} 
                      fullWidth 
                      required 
                      sx={textFieldSx}
                      InputProps={{
                        startAdornment: <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      label="Correo electrónico" 
                      name="email" 
                      value={form.email} 
                      onChange={handleChange} 
                      fullWidth 
                      required 
                      type="email" 
                      sx={textFieldSx}
                      InputProps={{
                        startAdornment: <EmailIcon sx={{ color: 'text.secondary', mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Columna derecha: Seguridad y Apariencia */}
          <Grid item xs={12} md={6}>
            {/* Tarjeta de seguridad */}
            <Card sx={theme => ({ 
              mb: 3,
              borderRadius: 3,
              boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
            })}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SecurityIcon sx={{ color: '#00830e' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Seguridad
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Cambia tu contraseña para mantener tu cuenta segura
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField 
                      label="Nueva contraseña" 
                      name="password" 
                      value={form.password} 
                      onChange={handleChange} 
                      fullWidth 
                      type="password" 
                      autoComplete="new-password" 
                      sx={textFieldSx}
                      InputProps={{
                        startAdornment: <LockIcon sx={{ color: 'text.secondary', mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      label="Confirmar nueva contraseña" 
                      name="confirmPassword" 
                      value={form.confirmPassword} 
                      onChange={handleChange} 
                      fullWidth 
                      type="password" 
                      autoComplete="new-password" 
                      error={!!passwordError} 
                      helperText={passwordError}
                      sx={textFieldSx}
                      InputProps={{
                        startAdornment: <LockIcon sx={{ color: 'text.secondary', mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Tarjeta de apariencia */}
            <Card sx={theme => ({ 
              borderRadius: 3,
              boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
            })}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PaletteIcon sx={{ color: '#00830e' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Apariencia
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Personaliza cómo se ve la aplicación
                </Typography>
                
                {/* Selector de tema visual */}
                <Grid container spacing={2}>
                  {temas.map(t => (
                    <Grid item xs={6} key={t.value}>
                      <Paper
                        onClick={() => setForm(f => ({ ...f, tema: t.value }))}
                        sx={theme => ({
                          p: 2,
                          cursor: 'pointer',
                          borderRadius: 2,
                          border: form.tema === t.value 
                            ? '2px solid #00830e' 
                            : `1px solid ${theme.palette.divider}`,
                          bgcolor: form.tema === t.value 
                            ? (theme.palette.mode === 'dark' ? 'rgba(0,131,14,0.15)' : 'rgba(0,131,14,0.08)')
                            : 'transparent',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: '#00830e',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }
                        })}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ 
                            bgcolor: t.value === 'dark' ? '#1a1a2e' : '#f5f5f5',
                            color: t.value === 'dark' ? '#fff' : '#333',
                            width: 48,
                            height: 48
                          }}>
                            {t.icon}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: form.tema === t.value ? 600 : 400 }}>
                            {t.label}
                          </Typography>
                          {form.tema === t.value && (
                            <Chip 
                              label="Activo" 
                              size="small" 
                              sx={{ 
                                bgcolor: '#00830e', 
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.7rem'
                              }} 
                            />
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Botón de guardar */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="submit" 
                variant="contained"
                disabled={loading}
                startIcon={<SaveIcon />}
                sx={{ 
                  py: 1.5,
                  px: 4,
                  background: 'linear-gradient(135deg, #00830e 0%, #00a819 100%)',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(0, 131, 14, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #006b0b 0%, #008c15 100%)',
                    boxShadow: '0 6px 20px rgba(0, 131, 14, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: 'grey.400'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

export default Preferencias;
