import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Alert, Chip, IconButton, TablePagination
} from "@mui/material";
import { BatteryChargingFull, Block, Edit, Delete } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, onValue, push, update, remove } from "firebase/database";

function TiempoCarga() {
  const { user, userData } = useAuth();
  const isInfra = userData?.rol === "infraestructura" || userData?.rol === "administrador" || (user && user.email === "admin@costaricacc.com");
  
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [tiemposCarga, setTiemposCarga] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedArticulo, setSelectedArticulo] = useState(null);
  const [form, setForm] = useState({
    fechaInicio: "",
    horaInicio: "",
    fechaFin: "",
    horaFin: "",
    observaciones: ""
  });
  const [editId, setEditId] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const rowsPerPage = 10;

  // Cargar datos
  useEffect(() => {
    const artRef = ref(db, "inventario");
    const catRef = ref(db, "categorias");
    const tiemposRef = ref(db, "tiemposCarga");
    
    const unsubArt = onValue(artRef, snap => {
      const data = snap.val() || {};
      setArticulos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    
    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    
    const unsubTiempos = onValue(tiemposRef, snap => {
      const data = snap.val() || {};
      setTiemposCarga(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    
    return () => { unsubArt(); unsubCat(); unsubTiempos(); };
  }, []);

  // Filtrar artículos de infraestructura
  const articulosInfra = useMemo(() => {
    const catInfra = categorias.find(c => c.nombre?.toLowerCase() === "infraestructura");
    if (!catInfra) return [];
    return articulos.filter(art => art.categoria === catInfra.id);
  }, [articulos, categorias]);

  // Verificar si un artículo está actualmente en tiempo de carga
  const estaEnCarga = (articuloId) => {
    const ahora = new Date();
    return tiemposCarga.some(tc => {
      if (tc.articuloId !== articuloId) return false;
      const inicio = new Date(tc.fechaInicio + 'T' + tc.horaInicio);
      const fin = new Date(tc.fechaFin + 'T' + tc.horaFin);
      return ahora >= inicio && ahora <= fin;
    });
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Abrir modal para crear/editar tiempo de carga
  const handleOpenModal = (articulo, tiempoCarga = null) => {
    setSelectedArticulo(articulo);
    if (tiempoCarga) {
      setEditId(tiempoCarga.id);
      setForm({
        fechaInicio: tiempoCarga.fechaInicio || "",
        horaInicio: tiempoCarga.horaInicio || "",
        fechaFin: tiempoCarga.fechaFin || "",
        horaFin: tiempoCarga.horaFin || "",
        observaciones: tiempoCarga.observaciones || ""
      });
    } else {
      setEditId(null);
      setForm({
        fechaInicio: "",
        horaInicio: "",
        fechaFin: "",
        horaFin: "",
        observaciones: ""
      });
    }
    setOpenModal(true);
    setError("");
    setSuccess("");
  };

  // Guardar tiempo de carga
  const handleGuardar = async () => {
    if (!form.fechaInicio || !form.horaInicio || !form.fechaFin || !form.horaFin) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    const inicio = new Date(form.fechaInicio + 'T' + form.horaInicio);
    const fin = new Date(form.fechaFin + 'T' + form.horaFin);
    
    if (inicio >= fin) {
      setError("La fecha/hora de fin debe ser posterior a la de inicio.");
      return;
    }

    try {
      const payload = {
        articuloId: selectedArticulo.id,
        articuloNombre: selectedArticulo.nombre,
        fechaInicio: form.fechaInicio,
        horaInicio: form.horaInicio,
        fechaFin: form.fechaFin,
        horaFin: form.horaFin,
        observaciones: form.observaciones,
        creadoPor: user?.email || null,
        creadoEn: new Date().toISOString()
      };

      if (editId) {
        await update(ref(db, `tiemposCarga/${editId}`), payload);
        setSuccess("Tiempo de carga actualizado correctamente.");
      } else {
        await push(ref(db, "tiemposCarga"), payload);
        setSuccess("Tiempo de carga programado correctamente.");
      }
      
      setOpenModal(false);
    } catch (err) {
      setError("Error al guardar: " + err.message);
    }
  };

  // Eliminar tiempo de carga
  const handleEliminar = async (tiempoCargaId) => {
    if (!window.confirm("¿Estás seguro de eliminar este tiempo de carga?")) return;
    
    try {
      await remove(ref(db, `tiemposCarga/${tiempoCargaId}`));
      setSuccess("Tiempo de carga eliminado correctamente.");
    } catch (err) {
      setError("Error al eliminar: " + err.message);
    }
  };

  // Filtrar tiempos de carga por búsqueda
  const tiemposFiltrados = useMemo(() => {
    return tiemposCarga.filter(tc => 
      tc.articuloNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.observaciones?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tiemposCarga, searchTerm]);

  // No mostrar el módulo si el usuario no es de infraestructura
  if (!isInfra) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Tiempo de Carga</Typography>
        <Alert severity="warning">
          No tienes permisos para acceder a este módulo. Solo usuarios de Infraestructura pueden gestionar los tiempos de carga.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BatteryChargingFull /> Tiempo de Carga
      </Typography>
      
      {/* Tabla de artículos de infraestructura */}
      <Paper sx={{ p: 3, width: '100%', mb: 2 }}>
        <Typography variant="h6" gutterBottom>Artículos de Infraestructura</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Artículo</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {articulosInfra.map(art => {
                const enCarga = estaEnCarga(art.id);
                const tiempoActual = tiemposCarga.find(tc => 
                  tc.articuloId === art.id && estaEnCarga(art.id)
                );
                
                return (
                  <TableRow key={art.id}>
                    <TableCell>{art.nombre}</TableCell>
                    <TableCell>{art.cantidad}</TableCell>
                    <TableCell>
                      {enCarga ? (
                        <Chip 
                          icon={<Block />} 
                          label="En Carga" 
                          color="warning" 
                          size="small"
                        />
                      ) : (
                        <Chip 
                          label="Disponible" 
                          color="success" 
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleOpenModal(art)}
                        disabled={enCarga}
                        sx={{ mr: 1 }}
                      >
                        Programar Carga
                      </Button>
                      {tiempoActual && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleEliminar(tiempoActual.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Historial de tiempos de carga */}
      <Paper sx={{ p: 3, width: '100%', mb: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 1 }}>Historial de Tiempos de Carga</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            size="small"
            label="Buscar por artículo u observaciones"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: 320 }}
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Artículo</TableCell>
                <TableCell>Fecha/Hora Inicio</TableCell>
                <TableCell>Fecha/Hora Fin</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Observaciones</TableCell>
                <TableCell>Creado Por</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                const start = page * rowsPerPage;
                const paged = tiemposFiltrados.slice(start, start + rowsPerPage);
                
                if (paged.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography variant="caption">No hay tiempos de carga registrados.</Typography>
                      </TableCell>
                    </TableRow>
                  );
                }
                
                return paged.map((tc) => {
                  const ahora = new Date();
                  const inicio = new Date(tc.fechaInicio + 'T' + tc.horaInicio);
                  const fin = new Date(tc.fechaFin + 'T' + tc.horaFin);
                  const activo = ahora >= inicio && ahora <= fin;
                  const finalizado = ahora > fin;
                  
                  return (
                    <TableRow key={tc.id}>
                      <TableCell>{tc.articuloNombre}</TableCell>
                      <TableCell>{inicio.toLocaleString()}</TableCell>
                      <TableCell>{fin.toLocaleString()}</TableCell>
                      <TableCell>
                        {activo ? (
                          <Chip label="Activo" color="warning" size="small" />
                        ) : finalizado ? (
                          <Chip label="Finalizado" color="default" size="small" />
                        ) : (
                          <Chip label="Programado" color="info" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{tc.observaciones}</TableCell>
                      <TableCell>{tc.creadoPor}</TableCell>
                      <TableCell>
                        {!finalizado && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => {
                                const articulo = articulosInfra.find(a => a.id === tc.articuloId);
                                if (articulo) handleOpenModal(articulo, tc);
                              }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleEliminar(tc.id)}
                            >
                              <Delete />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={tiemposFiltrados.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
        />
      </Paper>

      {/* Modal para programar/editar tiempo de carga */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editId ? "Editar" : "Programar"} Tiempo de Carga
        </DialogTitle>
        <DialogContent>
          {selectedArticulo && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Artículo: {selectedArticulo.nombre}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Fecha inicio"
                    name="fechaInicio"
                    type="date"
                    value={form.fechaInicio}
                    onChange={handleChange}
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Hora inicio"
                    name="horaInicio"
                    type="time"
                    value={form.horaInicio}
                    onChange={handleChange}
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Fecha fin"
                    name="fechaFin"
                    type="date"
                    value={form.fechaFin}
                    onChange={handleChange}
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Hora fin"
                    name="horaFin"
                    type="time"
                    value={form.horaFin}
                    onChange={handleChange}
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
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
                  />
                </Grid>
              </Grid>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" sx={{ bgcolor: '#00830e' }}>
            {editId ? "Actualizar" : "Programar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TiempoCarga;