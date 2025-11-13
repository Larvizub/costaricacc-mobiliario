import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, MenuItem, Select, InputLabel, FormControl
} from "@mui/material";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";


function Dashboard() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [eventosMes, setEventosMes] = useState([]);
  const [totalSolicitudes, setTotalSolicitudes] = useState(0);
  const [totalAprobadas, setTotalAprobadas] = useState(0);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [solicitantes, setSolicitantes] = useState([]);
  // Cargar solicitantes para mostrar el nombre en vez del id
  useEffect(() => {
    const solisRef = ref(db, "solicitantes");
    const unsubSolis = onValue(solisRef, snap => {
      const data = snap.val() || {};
      setSolicitantes(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    return () => unsubSolis();
  }, []);

  useEffect(() => {
    const solRef = ref(db, "solicitudes");
    const unsub = onValue(solRef, snap => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, value]) => ({ id, ...value }));
      setSolicitudes(arr);
      setTotalSolicitudes(arr.length);
      setTotalAprobadas(arr.filter(s => s.estado === "aprobada").length);
      setTotalPendientes(arr.filter(s => !s.estado || s.estado === "pendiente").length);
      setEventosMes(arr.filter(s => {
        const fecha = new Date(s.fechaInicio + 'T' + (s.horaInicio || '00:00'));
        return fecha.getMonth() === mes && fecha.getFullYear() === anio;
      }));
    });
    return () => unsub();
  }, [mes, anio]);

  // Filtros de mes y año
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const anios = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Gráfico de barras: solicitudes por estado
  const estados = ["aprobada", "pendiente", "rechazada"];
  const dataBarras = estados.map(estado => ({
    estado: estado.charAt(0).toUpperCase() + estado.slice(1),
    cantidad: solicitudes.filter(s => {
      const fecha = new Date(s.fechaInicio + 'T' + (s.horaInicio || '00:00'));
      return fecha.getMonth() === mes && fecha.getFullYear() === anio && (s.estado || "pendiente") === estado;
    }).length
  }));

  // Gráfico de líneas: solicitudes por día del mes
  const diasMes = Array.from({ length: 31 }, (_, i) => i + 1);
  const dataLineas = diasMes.map(dia => {
    const count = solicitudes.filter(s => {
      const fecha = new Date(s.fechaInicio + 'T' + (s.horaInicio || '00:00'));
      return fecha.getMonth() === mes && fecha.getFullYear() === anio && fecha.getDate() === dia;
    }).length;
    return { dia, cantidad: count };
  }).filter(d => d.cantidad > 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card sx={theme => ({
            bgcolor: theme.palette.mode === 'dark' ? '#263238' : '#e8f5e9',
            color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
            boxShadow: theme.palette.mode === 'dark' ? 2 : 3
          })}>
            <CardContent>
              <Typography variant="h6">Solicitudes Totales</Typography>
              <Typography variant="h3" sx={{ color: theme => theme.palette.mode === 'dark' ? '#fff' : '#00830e' }}>{totalSolicitudes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={theme => ({
            bgcolor: theme.palette.mode === 'dark' ? '#37474f' : '#fffde7',
            color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
            boxShadow: theme.palette.mode === 'dark' ? 2 : 3
          })}>
            <CardContent>
              <Typography variant="h6">Pendientes</Typography>
              <Typography variant="h3" sx={{ color: theme => theme.palette.mode === 'dark' ? '#ffe082' : '#fbc02d' }}>{totalPendientes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={theme => ({
            bgcolor: theme.palette.mode === 'dark' ? '#263238' : '#e3f2fd',
            color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
            boxShadow: theme.palette.mode === 'dark' ? 2 : 3
          })}>
            <CardContent>
              <Typography variant="h6">Aprobadas</Typography>
              <Typography variant="h3" sx={{ color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2' }}>{totalAprobadas}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros de mes y año */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Mes</InputLabel>
            <Select value={mes} label="Mes" onChange={e => setMes(Number(e.target.value))}>
              {meses.map((m, i) => <MenuItem key={i} value={i}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Año</InputLabel>
            <Select value={anio} label="Año" onChange={e => setAnio(Number(e.target.value))}>
              {anios.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
      </Grid>


      {/* Gráficos en la misma fila */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>Solicitudes por estado</Typography>
          <Paper sx={{ p: 2 }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dataBarras} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="estado" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#00830e" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>Solicitudes por día del mes</Typography>
          <Paper sx={{ p: 2 }}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dataLineas} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cantidad" stroke="#00830e" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Eventos con mobiliario este mes</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Evento</TableCell>
              <TableCell>Solicitante</TableCell>
              <TableCell>Fechas</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventosMes.map(ev => {
              const solicitanteObj = solicitantes.find(s => s.id === ev.solicitante);
              return (
                <TableRow key={ev.id}>
                  <TableCell>{ev.evento}</TableCell>
                  <TableCell>{solicitanteObj ? solicitanteObj.nombre : ev.solicitante}</TableCell>
                  <TableCell>{ev.fechaInicio} {ev.horaInicio} - {ev.fechaFin} {ev.horaFin}</TableCell>
                  <TableCell>{ev.estado || "pendiente"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default Dashboard;
