import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, TablePagination
} from "@mui/material";
import { Check, Close, Visibility, Delete, FileDownload } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, onValue, update, get, remove } from "firebase/database";
import { sendMailGraph, getStatusHtml } from "../utils/email";


function Autorizacion() {
  const { user, userData } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [modal, setModal] = useState(false);
  const [rechazoObs, setRechazoObs] = useState("");
  const [approveDialog, setApproveDialog] = useState({ open: false, id: null, comment: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, id: null, title: '', message: '' });
  const [articulos, setArticulos] = useState([]);
  const [solicitantes, setSolicitantes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [categorias, setCategorias] = useState([]); // <-- Nuevo estado para categorías
  const [busqueda, setBusqueda] = useState("");
  const [notiMsg, setNotiMsg] = useState("");

  useEffect(() => {
    const solRef = ref(db, "solicitudes");
    const unsub = onValue(solRef, snap => {
      const data = snap.val() || {};
      setSolicitudes(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const artRef = ref(db, "inventario");
    const unsubArt = onValue(artRef, snap => {
      const data = snap.val() || {};
      setArticulos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const solisRef = ref(db, "solicitantes");
    const unsubSolis = onValue(solisRef, snap => {
      const data = snap.val() || {};
      setSolicitantes(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre, email: value.email || "" })));
    });
    const eventosRef = ref(db, "eventos");
    const unsubEventos = onValue(eventosRef, snap => {
      const data = snap.val() || {};
      setEventos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    // Cargar categorías
    const categoriasRef = ref(db, "categorias");
    const unsubCategorias = onValue(categoriasRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    return () => { unsub(); unsubArt(); unsubSolis(); unsubEventos(); unsubCategorias(); };
  }, []);

  const handleAprobar = async (id, comment = '') => {
    const payload = {
      estado: "aprobada",
      aprobadoComentario: comment || null,
      aprobadoPor: user?.uid || user?.email || null,
      aprobadoEn: new Date().toISOString()
    };
    await update(ref(db, `solicitudes/${id}`), payload);
    notificarCambioEstatus(id, "aprobada");
    // cerrar diálogo si estaba abierto
    setApproveDialog({ open: false, id: null, comment: '' });
  };
  const handleRechazar = async (id) => {
    const solicitudSnap = await get(ref(db, `solicitudes/${id}`));
    const solicitud = solicitudSnap.exists() ? solicitudSnap.val() : null;
    const detalleLiberado = (solicitud?.detalle || []).map(item => ({ ...item, liberado: true }));

    await update(ref(db, `solicitudes/${id}`), {
      estado: "rechazada",
      rechazoObs,
      detalle: detalleLiberado,
      rechazadaPor: user?.uid || user?.email || null,
      rechazadaEn: new Date().toISOString()
    });
    notificarCambioEstatus(id, "rechazada");
    setModal(false);
    setRechazoObs("");
  };

  const handleEliminar = async (id) => {
    try {
      await remove(ref(db, `solicitudes/${id}`));
      setNotiMsg('Solicitud eliminada correctamente.');
      // si el modal de detalle estaba abierto para esta solicitud, cerrarlo
      if (detalle && detalle.id === id) {
        setModal(false);
        setDetalle(null);
      }
    } catch (e) {
      setNotiMsg('No se pudo eliminar la solicitud.');
    }
    setTimeout(() => setNotiMsg(''), 4000);
  };

  const openConfirm = ({ action, id, title, message }) => {
    setConfirmDialog({ open: true, action, id, title, message });
  };

  const closeConfirm = () => setConfirmDialog({ open: false, action: null, id: null, title: '', message: '' });

  const handleConfirm = async () => {
    const { action, id } = confirmDialog;
    closeConfirm();
    if (action === 'delete') {
      await handleEliminar(id);
    } else if (action === 'reject') {
      // Asegurarse de usar la observación actual (rechazoObs) y luego llamar a handleRechazar
      await handleRechazar(id);
    }
  };

  const openApproveDialog = (id) => {
    setApproveDialog({ open: true, id, comment: '' });
  };

  const closeApproveDialog = () => setApproveDialog({ open: false, id: null, comment: '' });

  const handleApproveConfirm = async () => {
    if (!approveDialog.id) return;
    await handleAprobar(approveDialog.id, approveDialog.comment);
  };

  // Notificar cambio de estatus
  const notificarCambioEstatus = async (id, status) => {
    try {
      // Obtener la solicitud
      const solSnap = await get(ref(db, `solicitudes/${id}`));
      if (!solSnap.exists()) return;
      const solicitud = solSnap.val();
      // Buscar correo del solicitante
      const solicitanteObj = solicitantes.find(s => s.id === solicitud.solicitante);
      let solicitanteEmail = solicitanteObj?.email || "";
      // Determinar categorías de los artículos de la solicitud
      const categoriasDetalle = (solicitud.detalle || []).map(item => {
        const art = articulos.find(a => a.id === item.articulo);
        return art ? art.categoria : null;
      });
      const nombresCategorias = categoriasDetalle.map(cid => {
        const cat = categorias.find(c => c.id === cid);
        return cat ? cat.nombre : null;
      });
      // Leer pools de correos desde Firebase
      let correos = [];
      let correosAreas = [];
      let correosInfra = [];
      const snap = await get(ref(db, "notificaciones/correosSolicitudes"));
      correos = snap.exists() ? (Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val())) : [];
      const snapAreas = await get(ref(db, "notificaciones/correosAreasMontajes"));
      correosAreas = snapAreas.exists() ? (Array.isArray(snapAreas.val()) ? snapAreas.val() : Object.values(snapAreas.val())) : [];
      const snapInfra = await get(ref(db, "notificaciones/correosInfraestructura"));
      correosInfra = snapInfra.exists() ? (Array.isArray(snapInfra.val()) ? snapInfra.val() : Object.values(snapInfra.val())) : [];
      // Determinar pools según categoría
      const esAreas = nombresCategorias.some(n => n && n.trim().toLowerCase().normalize('NFD').replace(/[\u0001-\u007f]/g,"") === "áreas y montajes".normalize('NFD').replace(/[\u0001-\u007f]/g,"") || n && n.trim().toLowerCase() === "areas y montajes");
      const esInfra = nombresCategorias.some(n => n && n.trim().toLowerCase() === "infraestructura");
      let toEmails = [];
      if (solicitanteEmail) toEmails.push(solicitanteEmail);
      if (esAreas) toEmails = [...toEmails, ...correosAreas];
      if (esInfra) toEmails = [...toEmails, ...correosInfra];
      if (!esAreas && !esInfra) toEmails = [...toEmails, ...correos];
      toEmails = [...new Set(toEmails.filter(Boolean))];
      if (toEmails.length === 0) return;
      const logoUrlHeroica = "https://costaricacc.com/cccr/Logoheroica.png";
      const logoUrlCCCR = "https://costaricacc.com/cccr/Logocccr.png";
      const html = getStatusHtml({
        solicitud: {
          ...solicitud,
          solicitanteNombre: solicitanteObj ? solicitanteObj.nombre : solicitud.solicitante,
          detalle: solicitud.detalle?.map(item => ({
            ...item,
            nombre: (articulos.find(a => a.id === item.articulo)?.nombre) || item.articulo
          }))
        },
        status,
        logoUrlHeroica,
        logoUrlCCCR
      });
      await sendMailGraph({
        toEmails,
        subject: `Actualización de Solicitud: ${status}`,
        html
      });
      setNotiMsg("Correo de notificación enviado correctamente.");
    } catch (e) {
      setNotiMsg("No se pudo enviar el correo de notificación.");
    }
    setTimeout(() => setNotiMsg(""), 4000);
  }
  const handleVerDetalle = (sol) => {
    setDetalle(sol);
    setModal(true);
  };

  const exportToXlsx = async (filename, rows) => {
    if (!rows || !rows.length) return;

    try {
      const XLSX = await import('xlsx');
      const data = rows.map(r => {
      const solicitanteObj = solicitantes.find(s => s.id === r.solicitante);
      const solicitanteNombre = solicitanteObj ? solicitanteObj.nombre : r.solicitante;
      const items = (r.detalle || []).map(it => {
        const art = articulos.find(a => a.id === it.articulo);
        const nombre = art ? art.nombre : it.articulo;
        return `${nombre} (x${it.cantidad})`;
      }).join('; ');

      // Determinar ID visible del evento: primero por eventoId, sino por nombre
      let eventoVisibleId = '';
      try {
        let eventoObj = null;
        if (r.eventoId) {
          eventoObj = eventos.find(e => e.id === r.eventoId);
        } else if (r.evento) {
          eventoObj = eventos.find(e => e.nombre === r.evento);
        }
        eventoVisibleId = eventoObj && eventoObj.id ? eventoObj.id : (r.eventoId || '');
      } catch (e) {
        eventoVisibleId = r.eventoId || '';
      }

      return {
        'ID Evento': eventoVisibleId || '',
        'Evento': r.evento || '',
        'Artículos': items || '',
        'Solicitante': solicitanteNombre || '',
        'Fecha Inicio': r.fechaInicio || '',
        'Hora Inicio': r.horaInicio || '',
        'Fecha Fin': r.fechaFin || '',
        'Hora Fin': r.horaFin || '',
        'Persona entrega': r.entrega || '',
        'Observaciones': r.observaciones || '',
        'Estado': r.estado || ''
      };
    });

      const ws = XLSX.utils.json_to_sheet(data);
      // Ajustes de columna para mejor lectura
      ws['!cols'] = [
      { wch: 12 }, // ID Evento
      { wch: 30 }, // Evento
      { wch: 50 }, // Artículos
      { wch: 25 }, // Solicitante
      { wch: 12 }, // Fecha Inicio
      { wch: 10 }, // Hora Inicio
      { wch: 12 }, // Fecha Fin
      { wch: 10 }, // Hora Fin
      { wch: 25 }, // Persona entrega
      { wch: 40 }, // Observaciones
      { wch: 12 }  // Estado
    ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Autorizaciones');
      XLSX.writeFile(wb, filename);
    } catch (e) {
      console.error('Error loading xlsx for export', e);
      alert('No fue posible exportar a Excel. Intenta recargar la página.');
    }
  };

  const handleExport = () => {
    exportToXlsx('autorizaciones_export.xlsx', filteredSolicitudes);
  };

  const canUserRejectGlobal = userData?.rol === 'areas' || userData?.rol === 'infraestructura' || userData?.rol === 'administrador' || (user && user.email === "admin@costaricacc.com");

  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  useEffect(() => {
    setPage(0);
  }, [busqueda]);

  // Filtrado aplicado una sola vez para paginación
  const filteredSolicitudes = solicitudes.filter(sol => {
    // Filtrado por búsqueda
    const s = solicitantes.find(x => x.id === sol.solicitante);
    const nombreSolicitante = s ? s.nombre : sol.solicitante;
    const estado = sol.estado || "pendiente";
    const matchBusqueda = (
      sol.evento?.toLowerCase().includes(busqueda.toLowerCase()) ||
      nombreSolicitante?.toLowerCase().includes(busqueda.toLowerCase()) ||
      estado?.toLowerCase().includes(busqueda.toLowerCase())
    );
    if (!matchBusqueda) return false;

    // Filtrado por rol
    if (userData?.rol === "administrador" || user?.email === "admin@costaricacc.com") {
      return true; // Admin ve todo
    }
    // Buscar categorías de los artículos de la solicitud
    const categoriasSolicitud = (sol.detalle || []).map(item => {
      const art = articulos.find(a => a.id === item.articulo);
      return art ? art.categoria : null;
    }).filter(Boolean);
    // Comparar el ID de la categoría directamente
    // Buscar el ID de la categoría por nombre para cada rol
    const idAreas = categorias.find(c => c.nombre.trim().toLowerCase() === "áreas y montajes")?.id;
    const idInfra = categorias.find(c => c.nombre.trim().toLowerCase() === "infraestructura")?.id;
    if (userData?.rol === "areas" && idAreas) {
      return categoriasSolicitud.includes(idAreas);
    }
    if (userData?.rol === "infraestructura" && idInfra) {
      return categoriasSolicitud.includes(idInfra);
    }
    return false;
  });

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredSolicitudes.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredSolicitudes.length]);

  // Paginación invertida: page=0 => última página
  const pagedSolicitudes = (() => {
    const total = filteredSolicitudes.length;
    if (total === 0) return [];
    const totalPages = Math.ceil(total / rowsPerPage);
    const start = Math.max(0, (totalPages - 1 - page) * rowsPerPage);
    return filteredSolicitudes.slice(start, start + rowsPerPage);
  })();

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Autorización de Solicitudes</Typography>
      <TextField
        label="Buscar por evento, solicitante o estado"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        fullWidth
        margin="normal"
        variant="outlined"
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
        <Button variant="contained" color="primary" startIcon={<FileDownload />} onClick={handleExport}>Exportar a Excel</Button>
      </Box>
      <TableContainer component={Paper} sx={theme => ({ borderRadius: 3, boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)' })}>
        <Table>
          <TableHead>
            <TableRow sx={theme => ({ bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,131,14,0.2)' : 'rgba(0,131,14,0.08)' })}>
              <TableCell sx={{ fontWeight: 600 }}>ID Evento</TableCell>
              <TableCell>Evento</TableCell>
              <TableCell>Artículos</TableCell>
              <TableCell>Solicitante</TableCell>
              <TableCell>Fechas</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedSolicitudes.map(sol => (
              <TableRow key={sol.id}>
                <TableCell>{
                  (() => {
                    // Buscar el evento relacionado por el campo que relacione la solicitud con el evento
                    // sol.eventoId debe ser el id de la tabla de eventos
                    let evento = null;
                    if (sol.eventoId) {
                      evento = eventos.find(e => e.id === sol.eventoId);
                    } else if (sol.evento) {
                      // Si sol.evento es el nombre, buscar el evento por nombre
                      evento = eventos.find(e => e.nombre === sol.evento);
                    }
                    // Mostrar el campo "id" del evento (que es el ID visible del módulo de eventos)
                    return evento && evento.id ? evento.id : '-';
                  })()
                }</TableCell>
                <TableCell>{sol.evento}</TableCell>
                <TableCell>
                  {(() => {
                    const items = (sol.detalle || []).map(it => {
                      const art = articulos.find(a => a.id === it.articulo);
                      return art ? art.nombre : it.articulo;
                    });
                    const text = items.join(', ');
                    const tooLong = text.length > 80;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            maxWidth: 280,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleVerDetalle(sol)}
                          title={text}
                        >
                          {text || '-'}
                        </div>
                        {tooLong && (
                          <IconButton size="small" onClick={() => handleVerDetalle(sol)} title="Ver items"><Visibility fontSize="small" /></IconButton>
                        )}
                      </div>
                    );
                  })()}
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
                <TableCell align="right">
                  <IconButton color="primary" onClick={() => handleVerDetalle(sol)}><Visibility /></IconButton>
                  {/* Aprobar solo si está pendiente */}
                  {(!sol.estado || sol.estado === "pendiente") && (
                    <IconButton color="success" onClick={() => openApproveDialog(sol.id)}><Check /></IconButton>
                  )}
                  {/* Rechazar: si está pendiente, mostrar como antes; además permitir a roles areas/infraestructura rechazar incluso si ya fue aprobada */}
                  {((!sol.estado || sol.estado === "pendiente") || userData?.rol === 'areas' || userData?.rol === 'infraestructura' || userData?.rol === 'administrador' || (user && user.email === "admin@costaricacc.com")) && (
                    <IconButton color="error" onClick={() => { setDetalle(sol); setModal(true); }} title="Rechazar"><Close /></IconButton>
                  )}
                  {/* Eliminar: permitir para areas/infraestructura y admin */}
                  {(userData?.rol === 'areas' || userData?.rol === 'infraestructura' || userData?.rol === 'administrador' || (user && user.email === "admin@costaricacc.com")) && (
                    <IconButton color="error" onClick={() => openConfirm({ action: 'delete', id: sol.id, title: 'Eliminar solicitud', message: '¿Confirma eliminar esta solicitud? Esta acción no se puede deshacer.' })} title="Eliminar"><Delete /></IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredSolicitudes.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[rowsPerPage]}
      />

      {/* Confirmación genérica */}
      <Dialog 
        open={confirmDialog.open} 
        onClose={closeConfirm} 
        maxWidth="xs" 
        fullWidth
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
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeConfirm} sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button 
            color="error" 
            variant="contained" 
            onClick={handleConfirm}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para aprobar con comentario */}
      <Dialog
        open={approveDialog.open}
        onClose={closeApproveDialog}
        maxWidth="sm"
        fullWidth
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
          Aprobar Solicitud
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ mb: 2 }}>Puedes añadir un comentario que quede registrado junto a la aprobación (opcional):</Typography>
          <TextField
            label="Comentario de aprobación"
            value={approveDialog.comment}
            onChange={e => setApproveDialog(ad => ({ ...ad, comment: e.target.value }))}
            fullWidth
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeApproveDialog} sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button
            color="success"
            variant="contained"
            onClick={handleApproveConfirm}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Aprobar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de detalle y rechazo */}
      <Dialog 
        open={!!detalle && modal} 
        onClose={() => { setModal(false); setDetalle(null); }} 
        maxWidth="sm" 
        fullWidth
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
          Detalle de Solicitud
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {detalle && (
            <>
              <Typography variant="subtitle1"><b>Evento:</b> {detalle.evento}</Typography>
              <Typography variant="subtitle1"><b>Solicitante:</b> {
                (() => {
                  const s = solicitantes.find(x => x.id === detalle.solicitante);
                  return s ? s.nombre : detalle.solicitante;
                })()
              }</Typography>
              <Typography variant="subtitle1"><b>Fechas:</b> {detalle.fechaInicio} {detalle.horaInicio} - {detalle.fechaFin} {detalle.horaFin}</Typography>
              <Typography variant="subtitle1"><b>Persona a quien se entrega:</b> {detalle.entrega}</Typography>
              <Typography variant="subtitle1"><b>Observaciones:</b> {detalle.observaciones}</Typography>
              <Typography variant="subtitle1" sx={{ mt: 2 }}><b>Mobiliario:</b></Typography>
              <ul>
                {(detalle.detalle || []).map((item, idx) => {
                  const art = articulos.find(a => a.id === item.articulo);
                  return (
                    <li key={idx}>Artículo: {art ? art.nombre : item.articulo} | Cantidad: {item.cantidad}</li>
                  );
                })}
              </ul>
              {((!detalle.estado || detalle.estado === "pendiente") || canUserRejectGlobal) && (
                <TextField
                  label="Motivo de rechazo (opcional)"
                  value={rechazoObs}
                  onChange={e => setRechazoObs(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  sx={{ mt: 2 }}
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setModal(false); setDetalle(null); }} sx={{ borderRadius: 2 }}>Cerrar</Button>
          {detalle && (((!detalle.estado || detalle.estado === "pendiente") || userData?.rol === 'areas' || userData?.rol === 'infraestructura' || userData?.rol === 'administrador' || (user && user.email === "admin@costaricacc.com"))) && (
            <Button 
              color="error" 
              variant="contained" 
              onClick={() => openConfirm({ action: 'reject', id: detalle.id, title: 'Confirmar rechazo', message: '¿Confirma rechazar esta solicitud?' })}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Rechazar
            </Button>
          )}
          {detalle && (userData?.rol === 'areas' || userData?.rol === 'infraestructura' || userData?.rol === 'administrador' || (user && user.email === "admin@costaricacc.com")) && (
            <Button 
              color="error" 
              variant="outlined" 
              onClick={() => openConfirm({ action: 'delete', id: detalle.id, title: 'Eliminar solicitud', message: '¿Confirma eliminar esta solicitud? Esta acción no se puede deshacer.' })}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Eliminar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    {/* Mensaje de confirmación de notificación */}
    {notiMsg && (
      <Box sx={{ mt: 2 }}>
        <Typography color={notiMsg.includes("correctamente") ? "success.main" : "error"}>{notiMsg}</Typography>
      </Box>
    )}
    </Box>
  );
}

export default Autorizacion;
