import React, { useContext, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import {
  Box, Typography, Paper, TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem, Alert
} from "@mui/material";
import { updateProfile, updateEmail, updatePassword } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";

const temas = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" }
];

function Preferencias() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({ nombre: "", email: "", password: "", confirmPassword: "", tema: "light" });
  const [passwordError, setPasswordError] = useState("");

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
    try {
      if (!user) throw new Error("No hay usuario autenticado");
      if (form.password && form.password !== form.confirmPassword) {
        setPasswordError("Las contraseñas no coinciden");
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
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Debes iniciar sesión para ver tus preferencias.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Preferencias</Typography>
      <Paper sx={theme => ({ 
        p: 3, 
        width: '100%', 
        maxWidth: 500,
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
      })}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Correo" name="email" value={form.email} onChange={handleChange} fullWidth required type="email" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Nueva contraseña" name="password" value={form.password} onChange={handleChange} fullWidth type="password" autoComplete="new-password" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Confirmar nueva contraseña" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} fullWidth type="password" autoComplete="new-password" error={!!passwordError} helperText={passwordError} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tema</InputLabel>
                <Select name="tema" value={form.tema} label="Tema" onChange={handleChange}>
                  {temas.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Button 
            type="submit" 
            variant="contained" 
            sx={{ 
              mt: 3,
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
              transition: 'all 0.2s ease'
            }}
          >
            Guardar cambios
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
export default Preferencias;
