import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, Paper, TextField, Button, MenuItem, Select, InputLabel, FormControl, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, push, onValue, get } from "firebase/database";
import { sendMailGraph, getSolicitudHtml } from "../utils/email";
import { searchEvent } from "../utils/skillService";

function Solicitud() {
  const { user, userData } = useAuth();
  // Permitir que cualquier usuario autenticado cree solicitudes (sin restricción por rol)
  const canCreateSolicitud = !!user;
  const [form, setForm] = useState({
    evento: "",
    solicitante: "",
    fechaInicio: "",
    horaInicio: "",
    fechaFin: "",
    horaFin: "",
    entrega: "",
    observaciones: ""
  });
  const [eventos, setEventos] = useState([]);
  const [eventoBusqueda, setEventoBusqueda] = useState("");
  const [searchingEvent, setSearchingEvent] = useState(false);
  const [solicitantes, setSolicitantes] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [detalle, setDetalle] = useState([]); // [{articuloId, cantidad}]
  const [modal, setModal] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [detalleForm, setDetalleForm] = useState({ articulo: "", cantidad: "" });
  const [error, setError] = useState("");
  const [errorModal, setErrorModal] = useState(false);
  const [success, setSuccess] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [lastSolicitudId, setLastSolicitudId] = useState(null);

  // Cargar solicitantes, artículos, categorías y eventos
  useEffect(() => {
    const solRef = ref(db, "solicitantes");
    const artRef = ref(db, "inventario");
    const repRef = ref(db, "reparaciones");
    const catRef = ref(db, "categorias");
    const eventosRef = ref(db, "eventos");
    const unsubSol = onValue(solRef, snap => {
      const data = snap.val() || {};
      setSolicitantes(
        Object.entries(data).map(([id, value]) => ({
          id,
          nombre: value.nombre,
          email: value.email || '',
          rol: value.rol || ''
        }))
      );
    });
    const unsubArt = onValue(artRef, snap => {
      const data = snap.val() || {};
      setArticulos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const unsubRep = onValue(repRef, snap => {
      const data = snap.val() || {};
      setReparaciones(Object.entries(data).map(([id, value]) => ({ firebaseId: id, ...value })));
    });
    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    const unsubEventos = onValue(eventosRef, snap => {
      const data = snap.val() || {};
      setEventos(Object.entries(data).map(([key, value]) => ({ key, ...value })));
    });
    return () => {
      unsubSol();
      unsubArt();
      unsubRep();
      unsubCat();
      unsubEventos();
    };
  }, []);

  // Manejo de campos del formulario principal
  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Manejo de tabla editable de mobiliario
  const handleAddDetalle = () => {
    if (!detalleForm.articulo || !detalleForm.cantidad) return;
    if (editIdx !== null) {
      setDetalle(arr => arr.map((d, i) => i === editIdx ? { ...detalleForm } : d));
      setEditIdx(null);
    } else {
      setDetalle(arr => [...arr, { ...detalleForm }]);
    }
    setDetalleForm({ articulo: "", cantidad: "" });
    setModal(false);
  };
  const handleEditDetalle = idx => {
    setEditIdx(idx);
    setDetalleForm(detalle[idx]);
    setModal(true);
  };
  const handleDeleteDetalle = idx => {
    setDetalle(arr => arr.filter((_, i) => i !== idx));
  };

  // Verificar disponibilidad de mobiliario y devolver detalles de conflicto
  const verificarDisponibilidad = async () => {
    const solRef = ref(db, "solicitudes");
    const tiemposRef = ref(db, "tiemposCarga");
    
    return new Promise(resolve => {
      onValue(solRef, async snap => {
        const data = snap.val() || {};
        
        // Obtener tiempos de carga
        const tiemposSnap = await get(tiemposRef);
        const tiemposCarga = tiemposSnap.exists() ? Object.values(tiemposSnap.val()) : [];
        
        let disponible = true;
        let conflicto = null;
        
        for (const d of detalle) {
          const articulo = articulos.find(a => a.id === d.articulo);
          if (!articulo) continue;
          
          let apartadas = 0;
          let fechasConflicto = [];
          
          // Verificar conflictos con otras solicitudes
          Object.values(data).forEach(sol => {
            const inicioA = new Date(form.fechaInicio + 'T' + form.horaInicio);
            const finA = new Date(form.fechaFin + 'T' + form.horaFin);
            const inicioB = new Date(sol.fechaInicio + 'T' + sol.horaInicio);
            const finB = new Date(sol.fechaFin + 'T' + sol.horaFin);
            if (finA >= inicioB && inicioA <= finB) {
              let cantidadSol = 0;
              (sol.detalle || []).forEach(item => {
                if (item.articulo === d.articulo && !item.liberado) {
                  cantidadSol += parseInt(item.cantidad);
                }
              });
              if (cantidadSol > 0) {
                fechasConflicto.push({
                  fechaInicio: sol.fechaInicio,
                  fechaFin: sol.fechaFin,
                  evento: sol.evento || "-",
                  tipo: "solicitud"
                });
                apartadas += cantidadSol;
              }
            }
          });
          
          // Verificar conflictos con tiempos de carga
          tiemposCarga.forEach(tc => {
            if (tc.articuloId === d.articulo) {
              const inicioA = new Date(form.fechaInicio + 'T' + form.horaInicio);
              const finA = new Date(form.fechaFin + 'T' + form.horaFin);
              const inicioB = new Date(tc.fechaInicio + 'T' + tc.horaInicio);
              const finB = new Date(tc.fechaFin + 'T' + tc.horaFin);
              
              if (finA >= inicioB && inicioA <= finB) {
                fechasConflicto.push({
                  fechaInicio: tc.fechaInicio,
                  fechaFin: tc.fechaFin,
                  evento: "Tiempo de Carga",
                  tipo: "carga",
                  observaciones: tc.observaciones || ""
                });
                // Durante tiempo de carga, todo el inventario está bloqueado
                apartadas += parseInt(articulo.cantidad);
              }
            }
          });
          
          // Calcular total disponible: Cantidad - Revisión
          const revisionCount = reparaciones
            .filter(r => r.id === articulo.id)
            .reduce((sum, r) => sum + (Number(r.revision) || 0), 0);
          const totalDisponible = parseInt(articulo.cantidad) - revisionCount;
          const disponibleActual = totalDisponible - apartadas;
          
          if (parseInt(d.cantidad) > disponibleActual) {
            disponible = false;
            conflicto = {
              articulo: articulo.nombre,
              disponible: disponibleActual < 0 ? 0 : disponibleActual,
              fechas: fechasConflicto
            };
            break;
          }
        }
        resolve({ disponible, conflicto });
      }, { onlyOnce: true });
    });
  };

  // Guardar solicitud
  const handleSubmit = async e => {
    try {
      e.preventDefault();
      setError("");
      setSuccess("");
      console.log('[Solicitud] handleSubmit llamado');
      if (!form.evento || !form.solicitante || !form.fechaInicio || !form.horaInicio || !form.fechaFin || !form.horaFin || !form.entrega || detalle.length === 0) {
        setError("Completa todos los campos obligatorios y agrega al menos un artículo.");
        console.error('[Solicitud] Error: campos obligatorios faltantes');
        return;
      }
      const { disponible, conflicto } = await verificarDisponibilidad();
      if (!disponible) {
        let msg = `No hay suficiente mobiliario disponible para el artículo "${conflicto.articulo}".\n`;
        msg += `Cantidad disponible: ${conflicto.disponible}.`;
        if (conflicto.fechas && conflicto.fechas.length > 0) {
          msg += "\nFechas y eventos en conflicto:\n";
          conflicto.fechas.forEach(f => {
            if (f.tipo === "carga") {
              msg += `• ${f.fechaInicio} a ${f.fechaFin} - ${f.evento}`;
              if (f.observaciones) msg += ` (${f.observaciones})`;
              msg += "\n";
            } else {
              msg += `• ${f.fechaInicio} a ${f.fechaFin} - Evento: ${f.evento}\n`;
            }
          });
        }
        setError(msg);
        setErrorModal(true);
        console.error('[Solicitud] Error: conflicto de disponibilidad', conflicto);
        return;
      }
      // Leer correos configurados en notificaciones generales y por categoría
      let correos = [];
      let correosAreas = [];
      let correosInfra = [];
      try {
        const snap = await get(ref(db, "notificaciones/correosSolicitudes"));
        correos = snap.exists() ? (Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val())) : [];
        const snapAreas = await get(ref(db, "notificaciones/correosAreasMontajes"));
        correosAreas = snapAreas.exists() ? (Array.isArray(snapAreas.val()) ? snapAreas.val() : Object.values(snapAreas.val())) : [];
        const snapInfra = await get(ref(db, "notificaciones/correosInfraestructura"));
        correosInfra = snapInfra.exists() ? (Array.isArray(snapInfra.val()) ? snapInfra.val() : Object.values(snapInfra.val())) : [];
      } catch (err) {
        correos = []; correosAreas = []; correosInfra = [];
        console.error('[Solicitud] Error leyendo correos de notificaciones:', err);
      }
      // Buscar nombre y correo del solicitante
      const solicitanteObj = solicitantes.find(s => s.id === form.solicitante);
      let solicitanteEmail = "";
      if (solicitanteObj && solicitanteObj.email) {
        solicitanteEmail = solicitanteObj.email;
      }
      // Determinar categorías de los artículos seleccionados
      const categoriasDetalle = detalle.map(d => {
        const art = articulos.find(a => a.id === d.articulo);
        return art ? art.categoria : null;
      });
      // Buscar nombres de categorías
      const nombresCategorias = categoriasDetalle.map(cid => {
        const cat = categorias.find(c => c.id === cid);
        return cat ? cat.nombre : null;
      });
      // Determinar si la solicitud es de Áreas y Montajes o Infraestructura
      const esAreas = nombresCategorias.some(n => n && n.trim().toLowerCase().normalize('NFD').replace(/[-\u007f]/g,"") === "áreas y montajes".normalize('NFD').replace(/[-\u007f]/g,"") || n && n.trim().toLowerCase() === "areas y montajes");
      const esInfra = nombresCategorias.some(n => n && n.trim().toLowerCase() === "infraestructura");
      // Construir destinatarios: siempre el solicitante y el pool correcto
      let toEmails = [];
      if (solicitanteEmail) toEmails.push(solicitanteEmail);
      if (esAreas) toEmails = [...toEmails, ...correosAreas];
      if (esInfra) toEmails = [...toEmails, ...correosInfra];
      if (!esAreas && !esInfra) toEmails = [...toEmails, ...correos];
      // Eliminar duplicados
      toEmails = [...new Set(toEmails.filter(Boolean))];
      // Enviar correo si hay destinatarios
      if (toEmails.length > 0) {
        const logoUrlHeroica = "https://costaricacc.com/cccr/Logoheroica.png";
        const logoUrlCCCR = "https://costaricacc.com/cccr/Logocccr.png";
        const html = getSolicitudHtml({
          solicitud: {
            ...form,
            detalle: detalle.map(item => ({
              ...item,
              nombre: (articulos.find(a => a.id === item.articulo)?.nombre) || item.articulo
            })),
            solicitanteNombre: solicitanteObj ? solicitanteObj.nombre : form.solicitante
          },
          logoUrlHeroica,
          logoUrlCCCR
        });
        console.log('[Solicitud] Enviando correo a:', toEmails, 'asunto:', "Nueva Solicitud de Mobiliario");
        sendMailGraph({
          toEmails,
          subject: "Nueva Solicitud de Mobiliario",
          html
        }).catch((err) => {
          console.error('[Solicitud] Error al enviar correo:', err);
          setError('Error al enviar correo: ' + err.message);
          setErrorModal(true);
        });
      } else {
        console.warn('[Solicitud] No hay destinatarios para el correo.');
      }
      const newRef = push(ref(db, "solicitudes"), {
        ...form,
        detalle,
        timestamp: Date.now()
      });
      const newKey = newRef.key || null;
      setLastSolicitudId(newKey);
      setSuccess("Solicitud registrada correctamente.");
      setConfirmModalOpen(true);
      setForm({ evento: "", solicitante: "", fechaInicio: "", horaInicio: "", fechaFin: "", horaFin: "", entrega: "", observaciones: "" });
      setDetalle([]);
    } catch (err) {
      console.error('[Solicitud] Error inesperado en handleSubmit:', err);
      setError('Error inesperado: ' + (err?.message || err));
      setErrorModal(true);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Solicitud de Mobiliario</Typography>
      <Paper sx={theme => ({ 
        p: 3, 
        width: '100%', 
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
      })}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* Campo de búsqueda de evento */}
            <Grid item xs={12}>
              <Box display="flex" gap={1}>
                <TextField
                  label="Buscar evento por ID"
                  value={eventoBusqueda}
                  onChange={e => setEventoBusqueda(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (!eventoBusqueda.trim()) return;
                    setSearchingEvent(true);
                    try {
                      const eventTitle = await searchEvent(eventoBusqueda);
                      if (eventTitle) {
                        setForm(f => ({ ...f, evento: eventTitle }));
                      } else {
                        setError("Evento no encontrado");
                        setErrorModal(true);
                      }
                    } catch (err) {
                      setError("Error al buscar evento");
                      setErrorModal(true);
                    }
                    setSearchingEvent(false);
                  }}
                  disabled={searchingEvent}
                  startIcon={searchingEvent ? <CircularProgress size={20} /> : null}
                  sx={{
                    py: 1.25,
                    px: 3,
                    background: 'linear-gradient(135deg, #00830e 0%, #00a819 100%)',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#fff',
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
                  {searchingEvent ? "Buscando..." : "Buscar"}
                </Button>
              </Box>
            </Grid>
            {/* Fila de Evento y Solicitante */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Evento"
                name="evento"
                value={form.evento}
                onChange={handleChange}
                fullWidth
                required
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <FormControl fullWidth required>
                <InputLabel>Solicitante</InputLabel>
                <Select name="solicitante" value={form.solicitante} label="Solicitante" onChange={handleChange}>
                  {solicitantes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Fecha inicial" name="fechaInicio" type="date" value={form.fechaInicio} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Hora inicial" name="horaInicio" type="time" value={form.horaInicio} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Fecha final" name="fechaFin" type="date" value={form.fechaFin} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Hora final" name="horaFin" type="time" value={form.horaFin} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Persona a quien se entrega" name="entrega" value={form.entrega} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observaciones"
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                fullWidth
                multiline
                minRows={3}
                maxRows={8}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2 }}>Mobiliario a apartar</Typography>
              {canCreateSolicitud ? (
                <Button variant="outlined" startIcon={<Add />} sx={{ mb: 1 }} onClick={() => { setEditIdx(null); setDetalleForm({ articulo: "", cantidad: "" }); setModal(true); }}>
                  Agregar artículo
                </Button>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No tiene permiso para agregar artículos. Sólo usuarios de Áreas o Infraestructura pueden crear solicitudes.</Typography>
              )}
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Artículo</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detalle.map((d, idx) => {
                      const art = articulos.find(a => a.id === d.articulo);
                      return (
                        <TableRow key={idx}>
                          <TableCell>{art?.nombre || ""}</TableCell>
                          <TableCell>{categorias.find(c => c.id === art?.categoria)?.nombre || ""}</TableCell>
                          <TableCell>{d.cantidad}</TableCell>
                          <TableCell align="right">
                            <IconButton color="primary" onClick={() => handleEditDetalle(idx)}><Edit /></IconButton>
                            <IconButton color="error" onClick={() => handleDeleteDetalle(idx)}><Delete /></IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
          {/* Modal de error de disponibilidad */}
          <Dialog 
            open={errorModal} 
            onClose={() => setErrorModal(false)}
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
              }
            }}
          >
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
              color: '#fff',
              fontWeight: 600
            }}>
              Error de disponibilidad
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Typography color="error" sx={{ whiteSpace: 'pre-line' }}>{error}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setErrorModal(false)} autoFocus sx={{ borderRadius: 2 }}>Cerrar</Button>
            </DialogActions>
          </Dialog>
          {success && <Typography color="success.main" sx={{ mt: 2 }}>{success}</Typography>}
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
              '&:disabled': {
                background: 'grey.400'
              },
              transition: 'all 0.2s ease'
            }} 
            disabled={!canCreateSolicitud}
          >
            Enviar Solicitud
          </Button>
        </form>
      </Paper>

      {/* Modal para agregar/editar artículo */}
      <Dialog 
        open={modal} 
        onClose={() => setModal(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #00830e 0%, #006400 100%)',
          color: '#fff',
          fontWeight: 600
        }}>
          {editIdx !== null ? "Editar artículo" : "Agregar artículo"}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {/* Campo de búsqueda de artículo */}
          <TextField
            label="Buscar artículo"
            value={detalleForm.busquedaArticulo || ""}
            onChange={e => {
              const val = e.target.value;
              // Filtrar artículos y autocompletar si hay uno solo
              const filtrados = articulos.filter(a => a.nombre.toLowerCase().includes(val.toLowerCase()));
              let nuevoArticulo = detalleForm.articulo;
              if (filtrados.length === 1) {
                nuevoArticulo = filtrados[0].id;
              } else if (!filtrados.find(a => a.id === detalleForm.articulo)) {
                nuevoArticulo = "";
              }
              setDetalleForm(f => ({ ...f, busquedaArticulo: val, articulo: nuevoArticulo }));
            }}
            fullWidth
            margin="normal"
            autoFocus
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Artículo</InputLabel>
            <Select
              value={detalleForm.articulo}
              label="Artículo"
              onChange={e => setDetalleForm(f => ({ ...f, articulo: e.target.value }))}
            >
              {articulos
                .filter(art =>
                  !detalleForm.busquedaArticulo || art.nombre.toLowerCase().includes(detalleForm.busquedaArticulo.toLowerCase())
                )
                .map(art => (
                  <MenuItem key={art.id} value={art.id}>{art.nombre}</MenuItem>
                ))}
            </Select>
          </FormControl>
          {/* Mostrar cantidad total disponible (Total) del artículo seleccionado */}
          {detalleForm.articulo && (
            <Typography variant="body2" sx={{ mt: 1, mb: 1 }} color="text.secondary">
              Cantidad disponible: {(() => {
                const art = articulos.find(a => a.id === detalleForm.articulo);
                if (!art) return "-";
                const cantidad = Number(art.cantidad) || 0;
                // Calcular revisión desde reparaciones (como en el módulo Inventario)
                const revisionCount = reparaciones
                  .filter(r => r.id === art.id)
                  .reduce((sum, r) => sum + (Number(r.revision) || 0), 0);
                return cantidad - revisionCount;
              })()}
            </Typography>
          )}
          <TextField
            label="Cantidad"
            type="number"
            value={detalleForm.cantidad}
            onChange={e => setDetalleForm(f => ({ ...f, cantidad: e.target.value }))}
            fullWidth
            margin="normal"
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModal(false)} sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button 
            onClick={handleAddDetalle} 
            variant="contained" 
            sx={{ 
              background: 'linear-gradient(135deg, #00830e 0%, #006400 100%)',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #006b0b 0%, #005400 100%)'
              }
            }}
          >
            {editIdx !== null ? "Guardar" : "Agregar"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Modal de confirmación tras crear la solicitud */}
      <Dialog 
        open={confirmModalOpen} 
        onClose={() => setConfirmModalOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #00830e 0%, #006400 100%)',
          color: '#fff',
          fontWeight: 600
        }}>
          Solicitud procesada
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography>La solicitud se procesó correctamente.</Typography>
          {lastSolicitudId && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>ID de la solicitud: {lastSolicitudId}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmModalOpen(false)} sx={{ borderRadius: 2 }}>Cerrar</Button>
          <Button 
            onClick={() => {
              setConfirmModalOpen(false);
              // reset form para iniciar otra solicitud
              setForm({ evento: "", solicitante: "", fechaInicio: "", horaInicio: "", fechaFin: "", horaFin: "", entrega: "", observaciones: "" });
              setDetalle([]);
              setSuccess("");
            }} 
            variant="contained" 
            sx={{ 
              background: 'linear-gradient(135deg, #00830e 0%, #006400 100%)',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #006b0b 0%, #005400 100%)'
              }
            }}
          >
            Crear otra solicitud
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Solicitud;
