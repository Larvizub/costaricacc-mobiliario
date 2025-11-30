import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, MenuItem, Select, InputLabel, FormControl, Chip, Avatar, LinearProgress, Divider, Alert, AlertTitle
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Cancel as CancelIcon,
  Build as BuildIcon,
  Inventory as InventoryIcon,
  Event as EventIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarIcon
} from "@mui/icons-material";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";


function Dashboard() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [eventosMes, setEventosMes] = useState([]);
  const [totalSolicitudes, setTotalSolicitudes] = useState(0);
  const [totalAprobadas, setTotalAprobadas] = useState(0);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [totalRechazadas, setTotalRechazadas] = useState(0);
  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [solicitantes, setSolicitantes] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proximosEventos, setProximosEventos] = useState([]);

  // Cargar datos adicionales
  useEffect(() => {
    const solisRef = ref(db, "solicitantes");
    const repRef = ref(db, "reparaciones");
    const invRef = ref(db, "inventario");
    const catRef = ref(db, "categorias");
    
    const unsubSolis = onValue(solisRef, snap => {
      const data = snap.val() || {};
      setSolicitantes(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    
    const unsubRep = onValue(repRef, snap => {
      const data = snap.val() || {};
      setReparaciones(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    
    const unsubInv = onValue(invRef, snap => {
      const data = snap.val() || {};
      setArticulos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    
    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    
    return () => {
      unsubSolis();
      unsubRep();
      unsubInv();
      unsubCat();
    };
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
      setTotalRechazadas(arr.filter(s => s.estado === "rechazada").length);
      setEventosMes(arr.filter(s => {
        const fecha = new Date(s.fechaInicio + 'T' + (s.horaInicio || '00:00'));
        return fecha.getMonth() === mes && fecha.getFullYear() === anio;
      }));
      
      // Próximos eventos (próximos 7 días)
      const hoy = new Date();
      const en7Dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
      const proximos = arr.filter(s => {
        if (s.estado !== "aprobada") return false;
        const fecha = new Date(s.fechaInicio + 'T' + (s.horaInicio || '00:00'));
        return fecha >= hoy && fecha <= en7Dias;
      }).sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)).slice(0, 5);
      setProximosEventos(proximos);
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

  // Datos para gráfico de pie
  const dataPie = [
    { name: 'Aprobadas', value: totalAprobadas, color: '#4caf50' },
    { name: 'Pendientes', value: totalPendientes, color: '#ff9800' },
    { name: 'Rechazadas', value: totalRechazadas, color: '#f44336' }
  ].filter(d => d.value > 0);

  // Calcular métricas adicionales
  const totalEnReparacion = reparaciones.length;
  const totalInventario = articulos.reduce((sum, a) => sum + (Number(a.cantidad) || 0), 0);
  const revisionEnReparaciones = reparaciones.reduce((sum, r) => sum + (Number(r.revision) || 0), 0);
  const tasaAprobacion = totalSolicitudes > 0 ? Math.round((totalAprobadas / totalSolicitudes) * 100) : 0;

  // Colores para el gráfico de barras
  const getBarColor = (estado) => {
    switch(estado.toLowerCase()) {
      case 'aprobada': return '#4caf50';
      case 'pendiente': return '#ff9800';
      case 'rechazada': return '#f44336';
      default: return '#00830e';
    }
  };

  // Formato de fecha amigable
  const formatFecha = (fecha, hora) => {
    const date = new Date(fecha + 'T' + (hora || '00:00'));
    return date.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header con título y filtros */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Mes</InputLabel>
            <Select value={mes} label="Mes" onChange={e => setMes(Number(e.target.value))}>
              {meses.map((m, i) => <MenuItem key={i} value={i}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Año</InputLabel>
            <Select value={anio} label="Año" onChange={e => setAnio(Number(e.target.value))}>
              {anios.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Alertas importantes */}
      {totalPendientes > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          <AlertTitle>Atención</AlertTitle>
          Tienes <strong>{totalPendientes}</strong> solicitud{totalPendientes !== 1 ? 'es' : ''} pendiente{totalPendientes !== 1 ? 's' : ''} de revisar
        </Alert>
      )}

      {/* Tarjetas de estadísticas principales */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={theme => ({
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #1a237e 0%, #283593 100%)' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)'
          })}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Total Solicitudes</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>{totalSolicitudes}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <AssignmentIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={theme => ({
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)'
              : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            color: '#fff',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(56, 239, 125, 0.25)'
          })}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Aprobadas</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>{totalAprobadas}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <CheckCircleIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={tasaAprobacion} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#fff' }
                  }} 
                />
                <Typography variant="caption" sx={{ opacity: 0.9 }}>{tasaAprobacion}% tasa de aprobación</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={theme => ({
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #e65100 0%, #ff6d00 100%)'
              : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: '#fff',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(245, 87, 108, 0.25)'
          })}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Pendientes</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>{totalPendientes}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <PendingIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={theme => ({
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%)'
              : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: '#fff',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(79, 172, 254, 0.25)'
          })}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>En Reparación</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>{totalEnReparacion}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <BuildIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Segunda fila: Métricas de inventario */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={theme => ({ 
            p: 2.5, 
            borderRadius: 3, 
            height: '100%',
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff'
          })}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: '#00830e' }}>
                <InventoryIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">Inventario Total</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{totalInventario} unidades</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Categorías</Typography>
                <Typography variant="h6">{categorias.length}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Artículos</Typography>
                <Typography variant="h6">{articulos.length}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">En revisión</Typography>
                <Typography variant="h6" color="warning.main">{revisionEnReparaciones}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={theme => ({ 
            p: 2.5, 
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff'
          })}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: '#ff9800' }}>
                <CalendarIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Próximos Eventos (7 días)</Typography>
            </Box>
            {proximosEventos.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No hay eventos programados para los próximos 7 días
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {proximosEventos.map(ev => {
                  const solicitanteObj = solicitantes.find(s => s.id === ev.solicitante);
                  return (
                    <Chip
                      key={ev.id}
                      avatar={<Avatar sx={{ bgcolor: '#00830e' }}><EventIcon sx={{ fontSize: 16 }} /></Avatar>}
                      label={
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{ev.evento}</Typography>
                          <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                            {formatFecha(ev.fechaInicio, ev.horaInicio)}
                          </Typography>
                        </Box>
                      }
                      sx={{ 
                        height: 'auto', 
                        py: 1,
                        '& .MuiChip-label': { display: 'block', whiteSpace: 'normal' }
                      }}
                      variant="outlined"
                    />
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Gráficos en la misma fila */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={theme => ({ 
            p: 2.5, 
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff'
          })}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Distribución de Solicitudes</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={dataPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {dataPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={theme => ({ 
            p: 2.5, 
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff'
          })}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Por Estado ({meses[mes]})</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataBarras} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="estado" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                  {dataBarras.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.estado)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={theme => ({ 
            p: 2.5, 
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff'
          })}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Tendencia Diaria</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dataLineas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="cantidad" stroke="#00830e" strokeWidth={3} dot={{ fill: '#00830e', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabla de eventos del mes */}
      <Paper sx={theme => ({ 
        p: 2.5, 
        borderRadius: 3,
        bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff'
      })}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: '#00830e' }}>
            <EventIcon />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Eventos con Mobiliario - {meses[mes]} {anio}
          </Typography>
          <Chip label={`${eventosMes.length} eventos`} size="small" color="primary" />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Evento</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Solicitante</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Fechas</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventosMes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay eventos registrados para este mes
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                eventosMes.map(ev => {
                  const solicitanteObj = solicitantes.find(s => s.id === ev.solicitante);
                  return (
                    <TableRow key={ev.id} hover>
                      <TableCell>{ev.evento}</TableCell>
                      <TableCell>{solicitanteObj ? solicitanteObj.nombre : ev.solicitante}</TableCell>
                      <TableCell>
                        {ev.fechaInicio} {ev.horaInicio} - {ev.fechaFin} {ev.horaFin}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={ev.estado || "pendiente"} 
                          size="small"
                          color={
                            ev.estado === "aprobada" ? "success" : 
                            ev.estado === "rechazada" ? "error" : 
                            "warning"
                          }
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default Dashboard;
