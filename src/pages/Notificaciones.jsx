import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, TextField, Button, List, ListItem, IconButton } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, onValue, set } from "firebase/database";

function Notificaciones() {
  const [correos, setCorreos] = useState([]);
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  // Pools para categorías específicas
  const [correosAreas, setCorreosAreas] = useState([]);
  const [nuevoCorreoAreas, setNuevoCorreoAreas] = useState("");
  const [correosInfra, setCorreosInfra] = useState([]);
  const [nuevoCorreoInfra, setNuevoCorreoInfra] = useState("");

  useEffect(() => {
    const unsub1 = onValue(ref(db, "notificaciones/correosSolicitudes"), snap => {
      const data = snap.val() || [];
      setCorreos(Array.isArray(data) ? data : Object.values(data));
    });
    const unsub2 = onValue(ref(db, "notificaciones/correosAreasMontajes"), snap => {
      const data = snap.val() || [];
      setCorreosAreas(Array.isArray(data) ? data : Object.values(data));
    });
    const unsub3 = onValue(ref(db, "notificaciones/correosInfraestructura"), snap => {
      const data = snap.val() || [];
      setCorreosInfra(Array.isArray(data) ? data : Object.values(data));
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const agregarCorreo = () => {
    if (!nuevoCorreo || correos.includes(nuevoCorreo)) return;
    const actualizados = [...correos, nuevoCorreo];
    set(ref(db, "notificaciones/correosSolicitudes"), actualizados);
    setNuevoCorreo("");
  };
  const eliminarCorreo = (correo) => {
    const actualizados = correos.filter(c => c !== correo);
    set(ref(db, "notificaciones/correosSolicitudes"), actualizados);
  };
  // Áreas y Montajes
  const agregarCorreoAreas = () => {
    if (!nuevoCorreoAreas || correosAreas.includes(nuevoCorreoAreas)) return;
    const actualizados = [...correosAreas, nuevoCorreoAreas];
    set(ref(db, "notificaciones/correosAreasMontajes"), actualizados);
    setNuevoCorreoAreas("");
  };
  const eliminarCorreoAreas = (correo) => {
    const actualizados = correosAreas.filter(c => c !== correo);
    set(ref(db, "notificaciones/correosAreasMontajes"), actualizados);
  };
  // Infraestructura
  const agregarCorreoInfra = () => {
    if (!nuevoCorreoInfra || correosInfra.includes(nuevoCorreoInfra)) return;
    const actualizados = [...correosInfra, nuevoCorreoInfra];
    set(ref(db, "notificaciones/correosInfraestructura"), actualizados);
    setNuevoCorreoInfra("");
  };
  const eliminarCorreoInfra = (correo) => {
    const actualizados = correosInfra.filter(c => c !== correo);
    set(ref(db, "notificaciones/correosInfraestructura"), actualizados);
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Notificaciones</Typography>
      <Paper sx={theme => ({ 
        p: 3, 
        mb: 3,
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
      })}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Correos para recibir notificaciones de nuevas solicitudes</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="Agregar correo"
            value={nuevoCorreo}
            onChange={e => setNuevoCorreo(e.target.value)}
            size="small"
            fullWidth
          />
          <Button variant="contained" onClick={agregarCorreo}>Agregar</Button>
        </Box>
        <List>
          {correos.map(correo => (
            <ListItem key={correo} secondaryAction={
              <IconButton edge="end" color="error" onClick={() => eliminarCorreo(correo)}>
                <Delete />
              </IconButton>
            }>
              {correo}
            </ListItem>
          ))}
        </List>
      </Paper>
      {/* Pool Áreas y Montajes */}
      <Paper sx={theme => ({ 
        p: 3, 
        mb: 3,
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
      })}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Correos para solicitudes de Áreas y Montajes</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="Agregar correo"
            value={nuevoCorreoAreas}
            onChange={e => setNuevoCorreoAreas(e.target.value)}
            size="small"
            fullWidth
          />
          <Button variant="contained" onClick={agregarCorreoAreas}>Agregar</Button>
        </Box>
        <List>
          {correosAreas.map(correo => (
            <ListItem key={correo} secondaryAction={
              <IconButton edge="end" color="error" onClick={() => eliminarCorreoAreas(correo)}>
                <Delete />
              </IconButton>
            }>
              {correo}
            </ListItem>
          ))}
        </List>
      </Paper>
      {/* Pool Infraestructura */}
      <Paper sx={theme => ({ 
        p: 3, 
        mb: 3,
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
      })}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Correos para solicitudes de Infraestructura</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="Agregar correo"
            value={nuevoCorreoInfra}
            onChange={e => setNuevoCorreoInfra(e.target.value)}
            size="small"
            fullWidth
          />
          <Button variant="contained" onClick={agregarCorreoInfra}>Agregar</Button>
        </Box>
        <List>
          {correosInfra.map(correo => (
            <ListItem key={correo} secondaryAction={
              <IconButton edge="end" color="error" onClick={() => eliminarCorreoInfra(correo)}>
                <Delete />
              </IconButton>
            }>
              {correo}
            </ListItem>
          ))}
        </List>
      </Paper>
      <Typography variant="body2" color="textSecondary">
        Aquí puedes configurar los correos que recibirán notificaciones cuando se envíe una nueva solicitud. Para notificaciones de cambios de estatus, se notificará automáticamente al solicitante y al correo registrado en el pool de solicitantes.<br/>
        Además, si la solicitud tiene la categoría "Áreas y Montajes" o "Infraestructura", se notificará también a los pools correspondientes.
      </Typography>
    </Box>
  );
}

export default Notificaciones;
