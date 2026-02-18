import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, TablePagination, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem
} from "@mui/material";
import { Delete, Edit, Add } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, onValue, remove, update } from "firebase/database";

function Historial() {
  const { user, userData } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitantes, setSolicitantes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    evento: "",
    fechaInicio: "",
    horaInicio: "",
    fechaFin: "",
    horaFin: "",
    entrega: "",
    observaciones: "",
    detalle: []
  });

  useEffect(() => {
    const solRef = ref(db, "solicitudes");
    const unsub = onValue(solRef, snap => {
      const data = snap.val() || {};
      setSolicitudes(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const solisRef = ref(db, "solicitantes");
    const unsubSolis = onValue(solisRef, snap => {
      const data = snap.val() || {};
      setSolicitantes(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    const eventosRef = ref(db, "eventos");
    const unsubEventos = onValue(eventosRef, snap => {
      const data = snap.val() || {};
      setEventos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const artRef = ref(db, "inventario");
    const unsubArt = onValue(artRef, snap => {
      const data = snap.val() || {};
      setArticulos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    return () => { unsub(); unsubSolis(); unsubEventos(); unsubArt(); };
  }, []);

  useEffect(() => { setPage(0); }, [busqueda]);

  const canManage = userData?.rol === "areas" || userData?.rol === "infraestructura" || userData?.rol === "administrador" || (user && user.email === "admin@costaricacc.com");

  const handleEliminar = async (id) => {
    const confirmar = window.confirm("¿Confirma eliminar esta solicitud? Esta acción no se puede deshacer.");
    if (!confirmar) return;
    try {
      await remove(ref(db, `solicitudes/${id}`));
    } catch (error) {
      alert("No se pudo eliminar la solicitud.");
    }
  };

  const handleOpenEdit = (sol) => {
    setEditForm({
      id: sol.id,
      evento: sol.evento || "",
      fechaInicio: sol.fechaInicio || "",
      horaInicio: sol.horaInicio || "",
      fechaFin: sol.fechaFin || "",
      horaFin: sol.horaFin || "",
      entrega: sol.entrega || "",
      observaciones: sol.observaciones || "",
      detalle: Array.isArray(sol.detalle) ? sol.detalle.map((item) => ({ articulo: item.articulo || "", cantidad: item.cantidad || "" })) : []
    });
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditForm({
      id: "",
      evento: "",
      fechaInicio: "",
      horaInicio: "",
      fechaFin: "",
      horaFin: "",
      entrega: "",
      observaciones: "",
      detalle: []
    });
  };

  const handleAddDetalleItem = () => {
    setEditForm((prev) => ({
      ...prev,
      detalle: [...(prev.detalle || []), { articulo: "", cantidad: "" }]
    }));
  };

  const handleChangeDetalleItem = (index, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      detalle: (prev.detalle || []).map((item, idx) => idx === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleRemoveDetalleItem = (index) => {
    setEditForm((prev) => ({
      ...prev,
      detalle: (prev.detalle || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleSaveEdit = async () => {
    if (!editForm.id) return;
    if (!editForm.evento || !editForm.fechaInicio || !editForm.horaInicio || !editForm.fechaFin || !editForm.horaFin || !editForm.entrega) {
      alert("Completa los campos obligatorios para guardar la edición.");
      return;
    }
    const detalleValido = (editForm.detalle || []).length > 0 && (editForm.detalle || []).every((item) => item.articulo && Number(item.cantidad) > 0);
    if (!detalleValido) {
      alert("Debes agregar al menos un artículo con cantidad válida.");
      return;
    }
    try {
      await update(ref(db, `solicitudes/${editForm.id}`), {
        evento: editForm.evento,
        fechaInicio: editForm.fechaInicio,
        horaInicio: editForm.horaInicio,
        fechaFin: editForm.fechaFin,
        horaFin: editForm.horaFin,
        entrega: editForm.entrega,
        observaciones: editForm.observaciones || "",
        detalle: (editForm.detalle || []).map((item) => ({
          articulo: item.articulo,
          cantidad: Number(item.cantidad)
        }))
      });
      handleCloseEdit();
    } catch (error) {
      alert("No se pudo actualizar la solicitud.");
    }
  };

  const filteredSolicitudes = solicitudes.filter(sol => {
    const s = solicitantes.find(x => x.id === sol.solicitante);
    const nombreSolicitante = s ? s.nombre : sol.solicitante;
    const estado = sol.estado || "pendiente";
    return (
      sol.evento?.toLowerCase().includes(busqueda.toLowerCase()) ||
      nombreSolicitante?.toLowerCase().includes(busqueda.toLowerCase()) ||
      estado?.toLowerCase().includes(busqueda.toLowerCase())
    );
  });

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Historial de Solicitudes y Autorizaciones</Typography>
      <TextField
        label="Buscar por evento, solicitante o estado"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        fullWidth
        margin="normal"
        variant="outlined"
      />
      <TableContainer component={Paper} sx={theme => ({ borderRadius: 3, boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)' })}>
        <Table>
          <TableHead>
            <TableRow sx={theme => ({ bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,131,14,0.2)' : 'rgba(0,131,14,0.08)' })}>
              <TableCell sx={{ fontWeight: 600 }}>ID Evento</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Evento</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Artículo</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Solicitante</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Fechas</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Observaciones</TableCell>
              {canManage && <TableCell sx={{ fontWeight: 600 }} align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              if (!filteredSolicitudes || filteredSolicitudes.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={canManage ? 8 : 7}><Typography variant="caption">No hay resultados.</Typography></TableCell>
                  </TableRow>
                );
              }
              const start = page * rowsPerPage;
              const paged = filteredSolicitudes.slice(start, start + rowsPerPage);
              return paged.map(sol => (
                              <TableRow key={sol.id}>
                  <TableCell>{
                    (() => {
                      let evento = null;
                      if (sol.eventoId) {
                        evento = eventos.find(e => e.id === sol.eventoId);
                      } else if (sol.evento) {
                        evento = eventos.find(e => e.nombre === sol.evento);
                      }
                      return evento && evento.id ? evento.id : '-';
                    })()
                  }</TableCell>
                  <TableCell>{sol.evento}</TableCell>
                  <TableCell>
                    {sol.detalle && sol.detalle.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        {sol.detalle.map((item, idx) => {
                          const art = articulos.find(a => a.id === item.articulo);
                          return (
                            <li key={idx}>
                              {art ? art.nombre : item.articulo} ({item.cantidad})
                            </li>
                          );
                        })}
                      </ul>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{
                    (() => {
                      const s = solicitantes.find(x => x.id === sol.solicitante);
                      return s ? s.nombre : sol.solicitante;
                    })()
                  }</TableCell>
                  <TableCell>{sol.fechaInicio} {sol.horaInicio} - {sol.fechaFin} {sol.horaFin}</TableCell>
                  <TableCell>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 12,
                      color: '#fff',
                      fontWeight: 600,
                      backgroundColor:
                        (sol.estado === 'autorizado' || sol.estado === 'autorizada' || sol.estado === 'aprobada' || sol.estado === 'aprobado') ? '#43a047' :
                        (sol.estado === 'rechazado' || sol.estado === 'rechazada') ? '#e53935' :
                        sol.estado === 'pendiente' || !sol.estado ? '#fbc02d' :
                        '#90a4ae'
                    }}>
                      {sol.estado ? sol.estado.charAt(0).toUpperCase() + sol.estado.slice(1) : 'Pendiente'}
                    </span>
                  </TableCell>
                  <TableCell>{sol.observaciones}</TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleOpenEdit(sol)} title="Editar">
                        <Edit />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleEliminar(sol.id)} title="Eliminar">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ));
            })()}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredSolicitudes.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[5]}
      />

      <Dialog open={editDialogOpen} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Editar solicitud</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Evento"
            fullWidth
            value={editForm.evento}
            onChange={(e) => setEditForm((prev) => ({ ...prev, evento: e.target.value }))}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField
              margin="dense"
              label="Fecha inicio"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={editForm.fechaInicio}
              onChange={(e) => setEditForm((prev) => ({ ...prev, fechaInicio: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Hora inicio"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={editForm.horaInicio}
              onChange={(e) => setEditForm((prev) => ({ ...prev, horaInicio: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Fecha fin"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={editForm.fechaFin}
              onChange={(e) => setEditForm((prev) => ({ ...prev, fechaFin: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Hora fin"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={editForm.horaFin}
              onChange={(e) => setEditForm((prev) => ({ ...prev, horaFin: e.target.value }))}
            />
          </Box>
          <TextField
            margin="dense"
            label="Persona entrega"
            fullWidth
            value={editForm.entrega}
            onChange={(e) => setEditForm((prev) => ({ ...prev, entrega: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Observaciones"
            fullWidth
            multiline
            minRows={3}
            value={editForm.observaciones}
            onChange={(e) => setEditForm((prev) => ({ ...prev, observaciones: e.target.value }))}
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Artículos y cantidades</Typography>
            {(editForm.detalle || []).map((item, idx) => (
              <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField
                  select
                  label="Artículo"
                  value={item.articulo}
                  onChange={(e) => handleChangeDetalleItem(idx, 'articulo', e.target.value)}
                  size="small"
                >
                  {articulos.map((art) => (
                    <MenuItem key={art.id} value={art.id}>{art.nombre}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Cantidad"
                  type="number"
                  size="small"
                  inputProps={{ min: 1 }}
                  value={item.cantidad}
                  onChange={(e) => handleChangeDetalleItem(idx, 'cantidad', e.target.value)}
                />
                <IconButton color="error" onClick={() => handleRemoveDetalleItem(idx)} title="Quitar artículo">
                  <Delete />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<Add />} onClick={handleAddDetalleItem} sx={{ mt: 1 }}>
              Agregar artículo
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Historial;
