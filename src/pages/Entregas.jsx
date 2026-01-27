import React, { useEffect, useRef, useState, useContext, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, TextField, Grid, Alert, Divider, Chip, Stack, Tooltip, IconButton, TablePagination
} from "@mui/material";
const SignatureCanvas = React.lazy(() => import('react-signature-canvas'));
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { db } from "../firebase";
import { ref, onValue, update, get, push } from "firebase/database";
import { sendMailGraph, getStatusHtml } from "../utils/email";

// Lista de preguntas/checks exacta solicitada por el usuario
const itemsRevision = [
  { key: 'llantas', label: 'Llantas' },
  { key: 'luces', label: 'Luces' },
  { key: 'estado_canasta', label: 'Estado de la Canasta' },
  { key: 'estado_carroceria', label: 'Estado de la Carrocería' },
  { key: 'escapes_fluido', label: 'Escapes de aceite/fluido/agua' },
  { key: 'nivel_aceite_hidraulico', label: 'Nivel de Aceite Hidráulico' },
  { key: 'carga_bateria', label: 'Carga de la Batería' },
  { key: 'claxon_alarma', label: 'Claxon y alarma de movimiento' },
  { key: 'controles_indicadores', label: 'Controles de mando e indicadores' },
  { key: 'transmision_direccion', label: 'Trasmisión/Dirección' },
  { key: 'paros_emergencia', label: 'Paros de emergencia' }
];

function Entregas() {
  const { user, userData } = useAuth();
  const isAdmin = (user && user.email === "admin@costaricacc.com") || userData?.rol === "administrador";
  const [solicitudes, setSolicitudes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [solicitantes, setSolicitantes] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [selectedArticulo, setSelectedArticulo] = useState(null);
  const [revision, setRevision] = useState({});
  const [comentarios, setComentarios] = useState({});
  const [reviewType, setReviewType] = useState('entrega'); // 'entrega' or 'recepcion'
  const [entregadoA, setEntregadoA] = useState("");
  const [firma, setFirma] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");
  const sigCanvasRef = useRef(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState("");
  const [fechaFinFiltro, setFechaFinFiltro] = useState("");
  const rowsPerPage = 10;
  const [pageEntregas, setPageEntregas] = useState(0);
  const rowsPerPageEntregas = 10;
  const [page, setPage] = useState(0);
  const [liberarReserva, setLiberarReserva] = useState(false);
  const [operarioNombre, setOperarioNombre] = useState("");
  const [operarioTelefono, setOperarioTelefono] = useState("");
  const [operarioFirma, setOperarioFirma] = useState("");
  const operarioSigCanvasRef = useRef(null);

  useEffect(() => {
    const solRef = ref(db, "solicitudes");
    const catRef = ref(db, "categorias");
    const artRef = ref(db, "inventario");
    const solisRef = ref(db, "solicitantes");
    const unsubSol = onValue(solRef, snap => {
      const data = snap.val() || {};
      setSolicitudes(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const unsubArt = onValue(artRef, snap => {
      const data = snap.val() || {};
      setArticulos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const unsubSolis = onValue(solisRef, snap => {
      const data = snap.val() || {};
      setSolicitantes(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const recepRef = ref(db, "recepciones");
    const unsubRecep = onValue(recepRef, snap => {
      const data = snap.val() || {};
      setRecepciones(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    return () => { unsubSol(); unsubCat(); unsubArt(); unsubSolis(); if (unsubRecep) unsubRecep(); };
  }, []);

  // Filtrar solicitudes aprobadas y de categoría infraestructura, ordenadas por fecha más reciente
  const solicitudesInfra = useMemo(() => {
    return solicitudes.filter(sol => {
      if (sol.estado !== "aprobada" || !sol.detalle) return false;
      // Buscar si algún artículo es de categoría infraestructura
      const esInfra = sol.detalle.some(item => {
        const art = articulos.find(a => a.id === item.articulo);
        const cat = art && categorias.find(c => c.id === art.categoria);
        return cat && (cat.nombre === "Infraestructura");
      });
      if (!esInfra) return false;
      
      // Filtro por fecha de reserva
      if (fechaInicioFiltro && sol.fechaFin) {
        const fechaReserva = new Date(sol.fechaFin);
        const fechaInicio = new Date(fechaInicioFiltro);
        if (fechaReserva < fechaInicio) return false;
      }
      if (fechaFinFiltro && sol.fechaFin) {
        const fechaReserva = new Date(sol.fechaFin);
        const fechaFin = new Date(fechaFinFiltro);
        // Ajustar fecha fin al final del día
        fechaFin.setHours(23, 59, 59, 999);
        if (fechaReserva > fechaFin) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.fechaFin) - new Date(a.fechaFin));
  }, [solicitudes, articulos, categorias, fechaInicioFiltro, fechaFinFiltro]);

  const handleOpenRevision = (sol, articulo, overrideType = null, forceEmpty = false) => {
    setSelectedSolicitud(sol);
    setSelectedArticulo(articulo);
    const revRoot = sol.revisionEntrega || {};
    const rev = revRoot[articulo.articulo] || {};
    const typeToUse = overrideType || reviewType;
    const revTypeObj = rev[typeToUse] || {};
    // asegurar que el estado muestre el modo correcto
    setReviewType(typeToUse);
    if (rev && !forceEmpty) {
      setRevision({ ...itemsRevision.reduce((acc, it) => ({ ...acc, [it.key]: revTypeObj[it.key] ?? null }), {}) });
      setComentarios(revTypeObj.comentarios || {});
      setEntregadoA(revTypeObj.entregadoA || "");
      setFirma(revTypeObj.firma || "");
      setObservaciones(revTypeObj.observaciones || "");
      setFechaEntrega(revTypeObj.fechaEntrega || "");
      setHoraEntrega(revTypeObj.horaEntrega || "");
      setOperarioNombre(revTypeObj.operarioNombre || "");
      setOperarioTelefono(revTypeObj.operarioTelefono || "");
      setOperarioFirma(revTypeObj.operarioFirma || "");
      setTimeout(() => {
        if (sigCanvasRef.current && rev.firma) {
          // No se puede dibujar la firma, solo mostrar la imagen
        } else if (sigCanvasRef.current) {
          sigCanvasRef.current.clear();
        }
        if (operarioSigCanvasRef.current) operarioSigCanvasRef.current.clear();
      }, 200);
    } else {
      setRevision(itemsRevision.reduce((acc, it) => ({ ...acc, [it.key]: null }), {}));
      setComentarios({});
      setEntregadoA("");
      setFirma("");
      setObservaciones("");
      setFechaEntrega("");
      setHoraEntrega("");
      setOperarioNombre("");
      setOperarioTelefono("");
      setOperarioFirma("");
      setTimeout(() => {
        if (sigCanvasRef.current) sigCanvasRef.current.clear();
        if (operarioSigCanvasRef.current) operarioSigCanvasRef.current.clear();
      }, 200);
    }
    setOpenModal(true);
    setSuccess("");
    setError("");
    setLiberarReserva(false);
  };

  const handleCheck = (key, value) => {
    setRevision(r => ({ ...r, [key]: value }));
    if (!value) setComentarios(c => ({ ...c, [key]: "" }));
  };

  const handleComentario = (key, value) => {
    setComentarios(c => ({ ...c, [key]: value }));
  };

  const handleGuardarRevision = async () => {
    if (!selectedSolicitud || !selectedArticulo) {
      setError("No hay solicitud o artículo seleccionado.");
      console.log("[DEBUG] selectedSolicitud:", selectedSolicitud);
      console.log("[DEBUG] selectedArticulo:", selectedArticulo);
      return;
    }
    // Validar que todos los campos estén completos
    for (const item of itemsRevision) {
      if (revision[item.key] === null) {
        setError("Debes responder todas las preguntas de revisión.");
        console.log("[DEBUG] Falta respuesta en:", item.key);
        return;
      }
      if (revision[item.key] === false && !comentarios[item.key]) {
        setError("Si marcas 'Deficiente', debes agregar un comentario en '" + item.label + "'.");
        console.log("[DEBUG] Falta comentario en:", item.key);
        return;
      }
    }
    if (!entregadoA) {
      setError("Debes indicar a quién se entrega el equipo.");
      console.log("[DEBUG] entregadoA vacío");
      return;
    }
    // Tomar la firma actual del canvas si la variable está vacía
    let firmaActual = firma;
    if (!firmaActual && sigCanvasRef.current) {
      // Usar getCanvas() en vez de getTrimmedCanvas() para evitar el error
      const dataUrl = sigCanvasRef.current.getCanvas().toDataURL("image/png");
      firmaActual = dataUrl && dataUrl.length > 50 ? dataUrl : "";
    }
    if (!firmaActual) {
      setError("Debes ingresar la firma autógrafa.");
      console.log("[DEBUG] firma vacía");
      return;
    }
    // Tomar la firma del operario
    let operarioFirmaActual = operarioFirma;
    if (!operarioFirmaActual && operarioSigCanvasRef.current) {
      const dataUrl = operarioSigCanvasRef.current.getCanvas().toDataURL("image/png");
      operarioFirmaActual = dataUrl && dataUrl.length > 50 ? dataUrl : "";
    }
    // Validación extra: mostrar todos los datos antes de guardar
    console.log("[DEBUG] Guardando revisión:", {
      solicitudId: selectedSolicitud.id,
      articuloId: selectedArticulo.articulo,
      revision,
      comentarios,
      entregadoA,
      firma: firmaActual,
      fechaEntrega: fechaEntrega || "",
      horaEntrega: horaEntrega || "",
      observaciones,
      operarioNombre,
      operarioTelefono,
      operarioFirma: operarioFirmaActual,
      cantidad: selectedArticulo.cantidad
    });
    try {
      // Guardar revisión por artículo
      const prev = selectedSolicitud.revisionEntrega || {};
      const prevArt = prev[selectedArticulo.articulo] || {};
      const newTypeObj = {
        ...revision,
        comentarios,
        entregadoA,
        firma: firmaActual,
        fechaEntrega: fechaEntrega || "",
        horaEntrega: horaEntrega || "",
        observaciones,
        operarioNombre,
        operarioTelefono,
        operarioFirma: operarioFirmaActual,
        cantidad: selectedArticulo.cantidad
      };
      // Construir el nuevo objeto por artículo y asegurarnos de limpiar 'recepcion' cuando guardamos una entrega
      const typeToSave = reviewType; // siempre usamos el modo actual
      const newArtObj = {
        ...prevArt,
        [typeToSave]: newTypeObj
      };
      if (typeToSave === 'entrega' && newArtObj.recepcion) {
        // eliminar la recepcion previa para dejarla limpia y que se cree desde la tabla 'recepciones'
        delete newArtObj.recepcion;
      }
      const newRev = {
        ...prev,
        [selectedArticulo.articulo]: newArtObj
      };
      await update(ref(db, `solicitudes/${selectedSolicitud.id}`), { revisionEntrega: newRev });
      // Si guardamos modo 'entrega', crear una entrada en 'recepciones' para que nadie sobreescriba
      if (reviewType === 'entrega') {
        try {
          const recepPayload = {
            solicitudId: selectedSolicitud.id,
            articuloId: selectedArticulo.articulo,
            cantidad: selectedArticulo.cantidad,
            estado: 'pendiente',
            creadoPor: user?.email || null,
            creadoEn: new Date().toISOString()
          };
          await push(ref(db, 'recepciones'), recepPayload);
        } catch (err) {
          console.error('[Entregas] Error creando recepcion:', err);
        }
      }
      // Enviar notificación al pool de Infraestructura cuando se complete una revisión (entrega o recepción)
      try {
        const snapInfra = await get(ref(db, 'notificaciones/correosInfraestructura'));
        const poolInfra = snapInfra.exists() ? (Array.isArray(snapInfra.val()) ? snapInfra.val() : Object.values(snapInfra.val())) : [];
        const toEmails = Array.isArray(poolInfra) ? poolInfra.filter(Boolean) : [];
        if (toEmails.length > 0) {
          const logoUrlHeroica = "https://costaricacc.com/cccr/Logoheroica.png";
          const logoUrlCCCR = "https://costaricacc.com/cccr/Logocccr.png";
          const html = getStatusHtml({
            solicitud: {
              ...selectedSolicitud,
              solicitanteNombre: (solicitantes.find(s => s.id === selectedSolicitud.solicitante)?.nombre) || selectedSolicitud.solicitante,
              detalle: selectedSolicitud.detalle?.map(item => ({
                ...item,
                nombre: (articulos.find(a => a.id === item.articulo)?.nombre) || item.articulo
              }))
            },
            status: reviewType === 'entrega' ? 'entrega' : 'recepcion',
            logoUrlHeroica,
            logoUrlCCCR
          });
          const subject = `Revisión ${reviewType === 'entrega' ? 'Entrega' : 'Recepción'} - ${articulos.find(a => a.id === selectedArticulo.articulo)?.nombre || selectedArticulo.articulo}`;
          await sendMailGraph({ toEmails, subject, html });
        }
      } catch (err) {
        console.error('[Entregas] Error enviando notificación a Infraestructura:', err);
      }
      // --- Notificación por correo al aprobar ---
      try {
        // Buscar solicitante
        const solicitanteObj = solicitantes.find(s => s.id === selectedSolicitud.solicitante);
        let solicitanteEmail = solicitanteObj?.email || "";
        // Determinar categorías de los artículos de la solicitud
        const categoriasDetalle = (selectedSolicitud.detalle || []).map(d => {
          const art = articulos.find(a => a.id === d.articulo);
          return art ? art.categoria : null;
        });
        const nombresCategorias = categoriasDetalle.map(cid => {
          const cat = categorias.find(c => c.id === cid);
          return cat ? cat.nombre : null;
        });
        // Leer pools de correos
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
        // Enviar correo
        if (toEmails.length > 0) {
          const logoUrlHeroica = "https://costaricacc.com/cccr/Logoheroica.png";
          const logoUrlCCCR = "https://costaricacc.com/cccr/Logocccr.png";
          const html = getStatusHtml({
            solicitud: {
              ...selectedSolicitud,
              solicitanteNombre: solicitanteObj ? solicitanteObj.nombre : selectedSolicitud.solicitante,
              detalle: selectedSolicitud.detalle?.map(item => ({
                ...item,
                nombre: (articulos.find(a => a.id === item.articulo)?.nombre) || item.articulo
              }))
            },
            status: "aprobada",
            logoUrlHeroica,
            logoUrlCCCR
          });
          await sendMailGraph({
            toEmails,
            subject: "Solicitud de Mobiliario Aprobada",
            html
          });
        }
      } catch (err) {
        console.error('[Entregas] Error enviando correo de aprobación:', err);
      }
      // --- Fin notificación ---
      setSuccess("Revisión guardada correctamente.");
      // Si se guardó en modo entrega, cambiar automáticamente a modo recepción
      if (reviewType === 'entrega') {
        setReviewType('recepcion');
        // Resetear campos para recepción
        setRevision(itemsRevision.reduce((acc, it) => ({ ...acc, [it.key]: null }), {}));
        setComentarios({});
        setEntregadoA("");
        setFirma("");
        setObservaciones("");
        setFechaEntrega("");
        setHoraEntrega("");
        setLiberarReserva(false);
        setOperarioNombre("");
        setOperarioTelefono("");
        setOperarioFirma("");
        if (sigCanvasRef.current) sigCanvasRef.current.clear();
        if (operarioSigCanvasRef.current) operarioSigCanvasRef.current.clear();
        setSuccess("Revisión de entrega guardada. Ahora en modo recepción.");
        setError("");
      }
      // Liberar reserva si se marcó y es entrega antes del tiempo
      if (liberarReserva && reviewType === 'entrega') {
        const ahora = new Date();
        const finReserva = new Date(selectedSolicitud.fechaFin + 'T' + selectedSolicitud.horaFin);
        if (ahora < finReserva) {
          try {
            const detalleActualizado = (selectedSolicitud.detalle || []).map(item =>
              item.articulo === selectedArticulo.articulo ? { ...item, liberado: true } : item
            );
            await update(ref(db, `solicitudes/${selectedSolicitud.id}`), { detalle: detalleActualizado });
            console.log('[Entregas] Reserva liberada para artículo:', selectedArticulo.articulo);
          } catch (err) {
            console.error('[Entregas] Error liberando reserva:', err);
          }
        }
      }
      // No cerrar el modal para permitir recepción inmediata
      // setOpenModal(false);
    } catch (err) {
      setError("No se pudo guardar la revisión.");
      console.log("[DEBUG] Error al guardar:", err);
    }
  };

  const handleOpenRecepcion = async (recepcion) => {
    // Buscar la solicitud y artículo relacionados y abrir modal en modo 'recepcion'
    const sol = solicitudes.find(s => s.id === recepcion.solicitudId);
    if (!sol) return;
    const artItem = (sol.detalle || []).find(d => d.articulo === recepcion.articuloId);
    if (!artItem) return;
    // Abrir explícitamente en modo recepción y forzar limpieza si aplica
    handleOpenRevision(sol, artItem, 'recepcion');
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Entregas</Typography>
      
      {/* Controles de filtro para entregas pendientes */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="Fecha inicio"
          type="date"
          value={fechaInicioFiltro}
          onChange={e => { setFechaInicioFiltro(e.target.value); setPageEntregas(0); setPage(0); }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          label="Fecha fin"
          type="date"
          value={fechaFinFiltro}
          onChange={e => { setFechaFinFiltro(e.target.value); setPageEntregas(0); setPage(0); }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            setFechaInicioFiltro("");
            setFechaFinFiltro("");
            setPageEntregas(0);
            setPage(0);
          }}
        >
          Limpiar filtros
        </Button>
      </Box>

      <Paper sx={theme => ({ 
        p: 3, 
        width: '100%', 
        mb: 3,
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
      })}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Evento</TableCell>
                <TableCell>Solicitante</TableCell>
                <TableCell>Artículos</TableCell>
                <TableCell>Fecha de Reserva</TableCell>
                <TableCell>Estatus</TableCell>
                <TableCell>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                const startEntregas = pageEntregas * rowsPerPageEntregas;
                const pagedSolicitudesInfra = solicitudesInfra.slice(startEntregas, startEntregas + rowsPerPageEntregas);
                return pagedSolicitudesInfra.map(sol => (
                  sol.detalle.map((item, idx) => {
                    const art = articulos.find(a => a.id === item.articulo);
                    const revAll = sol && sol.revisionEntrega && sol.revisionEntrega[item.articulo];
                            const hasEntrega = revAll && revAll.entrega;
                            const hasRecepcion = revAll && revAll.recepcion;
                            // Si ya tiene entrega y recepcion, ocultamos la línea (revisado completamente)
                            if (hasEntrega && hasRecepcion) return null;
                            return (
                                <TableRow key={sol.id + '-' + item.articulo}>
                                  <TableCell>{sol.evento}</TableCell>
                                  <TableCell>{(() => {
                                    const s = solicitantes.find(x => x.id === sol.solicitante);
                                    return s ? s.nombre : sol.solicitante;
                                  })()}</TableCell>
                                  <TableCell>{art ? art.nombre : item.articulo} ({item.cantidad})</TableCell>
                                  <TableCell>{sol.fechaFin ? new Date(sol.fechaFin).toLocaleDateString() : ''}</TableCell>
                                  <TableCell>
                                    {hasEntrega && hasRecepcion ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Recibido</span>
                                      : hasEntrega ? <span style={{ color: '#00830e', fontWeight: 600 }}>Entregado</span>
                                      : <span style={{ color: '#fbc02d', fontWeight: 600 }}>Pendiente</span>}
                                  </TableCell>
                        <TableCell>
                            <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleOpenRevision(sol, item, 'entrega', true)}
                            sx={theme => ({
                              bgcolor: theme.palette.mode === 'dark' ? '#fff' : '#00830e',
                              color: theme.palette.mode === 'dark' ? '#111' : '#fff',
                              fontWeight: 600,
                              boxShadow: 'none',
                              '&:hover': {
                                bgcolor: theme.palette.mode === 'dark' ? '#eee' : '#00690b',
                                color: theme.palette.mode === 'dark' ? '#111' : '#fff',
                              },
                              border: theme.palette.mode === 'dark' ? '1px solid #222' : undefined
                            })}
                          >
                            Revisar
                          </Button>
                          {revAll && isAdmin && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              sx={{ ml: 1 }}
                              onClick={async () => {
                                // Eliminar revisión
                                const prev = sol.revisionEntrega || {};
                                const newRev = { ...prev };
                                delete newRev[item.articulo];
                                await update(ref(db, `solicitudes/${sol.id}`), { revisionEntrega: newRev });
                              }}
                            >Eliminar</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ));
              })()}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={solicitudesInfra.length}
          page={pageEntregas}
          onPageChange={(e, newPage) => setPageEntregas(newPage)}
          rowsPerPage={rowsPerPageEntregas}
          rowsPerPageOptions={[rowsPerPageEntregas]}
        />
      </Paper>
          {/* Historial global separado: muestra todas las entregas/recepciones guardadas */}
          <Paper sx={{ p: 3, width: '100%', mb: 2 }} variant="outlined">
            <Typography variant="h6" sx={{ mb: 1 }}>Historial de Revisiones Registradas</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="Buscar por evento"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                sx={{ width: 320 }}
              />
              <TextField
                size="small"
                label="Fecha inicio"
                type="date"
                value={fechaInicioFiltro}
                onChange={e => { setFechaInicioFiltro(e.target.value); setPageEntregas(0); setPage(0); }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <TextField
                size="small"
                label="Fecha fin"
                type="date"
                value={fechaFinFiltro}
                onChange={e => { setFechaFinFiltro(e.target.value); setPageEntregas(0); setPage(0); }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setFechaInicioFiltro("");
                  setFechaFinFiltro("");
                  setPageEntregas(0);
                  setPage(0);
                }}
              >
                Limpiar filtros
              </Button>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{/* placeholder for results count if needed */}</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Evento</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Solicitante</TableCell>
                    <TableCell>Artículo</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Fecha de Reserva</TableCell>
                    <TableCell>Estatus</TableCell>
                    <TableCell>Observaciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const rows = [];
                    for (const sol of solicitudes) {
                      if (!sol.detalle) continue;
                      const solicitanteObj = solicitantes.find(s => s.id === sol.solicitante);
                      const solicitanteNombre = solicitanteObj ? solicitanteObj.nombre : sol.solicitante;
                      for (const item of sol.detalle) {
                        const art = articulos.find(a => a.id === item.articulo);
                        const revRoot = sol.revisionEntrega && sol.revisionEntrega[item.articulo];
                        if (!revRoot) continue;
                        if (revRoot.entrega) {
                          const fechaEnt = revRoot.entrega && (revRoot.entrega.fechaEntrega || revRoot.entrega.creadoEn) || null;
                          rows.push({
                            solId: sol.id,
                            articuloId: item.articulo,
                            evento: sol.evento,
                            solicitante: solicitanteNombre,
                            articulo: art ? art.nombre : item.articulo,
                            cantidad: item.cantidad,
                            fechaReserva: sol.fechaFin ? new Date(sol.fechaFin).toLocaleDateString() : '',
                            estatus: 'Entrega',
                            fecha: fechaEnt,
                            observaciones: revRoot.entrega.observaciones || ''
                          });
                        }
                        if (revRoot.recepcion) {
                          const fechaRec = revRoot.recepcion && (revRoot.recepcion.fechaEntrega || revRoot.recepcion.creadoEn) || null;
                          rows.push({
                            solId: sol.id,
                            articuloId: item.articulo,
                            evento: sol.evento,
                            solicitante: solicitanteNombre,
                            articulo: art ? art.nombre : item.articulo,
                            cantidad: item.cantidad,
                            fechaReserva: sol.fechaFin ? new Date(sol.fechaFin).toLocaleDateString() : '',
                            estatus: 'Recepción',
                            fecha: fechaRec,
                            observaciones: revRoot.recepcion.observaciones || ''
                          });
                        }
                      }
                    }
                    // ordenar por fecha más reciente primero
                    rows.sort((a, b) => {
                      const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
                      const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
                      return fechaB - fechaA; // descendente: más reciente primero
                    });
                    // aplicar filtro por búsqueda (evento)
                    const filtered = rows.filter(r => r.evento && r.evento.toLowerCase().includes((searchTerm || '').toLowerCase()));
                    if (filtered.length === 0) return (<TableRow><TableCell colSpan={8}><Typography variant="caption">No hay revisiones registradas para la búsqueda.</Typography></TableCell></TableRow>);
                    // paginar
                    const start = page * rowsPerPage;
                    const paged = filtered.slice(start, start + rowsPerPage);
                    return paged.map((r, i) => (
                      <TableRow key={start + i}>
                        <TableCell>{r.evento}</TableCell>
                        <TableCell>{r.fecha ? new Date(r.fecha).toLocaleString() : ''}</TableCell>
                        <TableCell>{r.solicitante}</TableCell>
                        <TableCell>{r.articulo}</TableCell>
                        <TableCell>{r.cantidad}</TableCell>
                        <TableCell>{r.fechaReserva}</TableCell>
                        <TableCell>{r.estatus}</TableCell>
                        <TableCell>{r.observaciones}</TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined" onClick={() => {
                            const sol = solicitudes.find(s => s.id === r.solId);
                            if (!sol) return;
                            const artItem = (sol.detalle || []).find(d => d.articulo === r.articuloId);
                            if (!artItem) return;
                            const override = r.estatus === 'Recepción' ? 'recepcion' : 'entrega';
                            handleOpenRevision(sol, artItem, override);
                          }}>Revisar</Button>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={(() => {
                const rows = [];
                for (const sol of solicitudes) {
                  if (!sol.detalle) continue;
                  for (const item of sol.detalle) {
                    const revRoot = sol.revisionEntrega && sol.revisionEntrega[item.articulo];
                    if (!revRoot) continue;
                    if (revRoot.entrega) rows.push(1);
                    if (revRoot.recepcion) rows.push(1);
                  }
                }
                const filtered = rows.length ? rows : [];
                // aplicar el mismo filtro de búsqueda
                const total = (() => {
                  // reconstruir rows con evento para filtrar
                  const full = [];
                  for (const sol of solicitudes) {
                    if (!sol.detalle) continue;
                    for (const item of sol.detalle) {
                      const revRoot = sol.revisionEntrega && sol.revisionEntrega[item.articulo];
                      if (!revRoot) continue;
                      if (revRoot.entrega) full.push({ evento: sol.evento });
                      if (revRoot.recepcion) full.push({ evento: sol.evento });
                    }
                  }
                  return full.filter(r => r.evento && r.evento.toLowerCase().includes((searchTerm || '').toLowerCase())).length;
                })();
                return total;
              })()}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
            />
          </Paper>
      {/* Modal de revisión */}
      <Dialog 
        open={openModal} 
        onClose={() => setOpenModal(false)} 
        maxWidth="md" 
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
          Revisión de entrega y recepción
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 3, overflowX: 'hidden' }}>
          {selectedSolicitud && selectedArticulo && (() => {
            const rev = selectedSolicitud && selectedSolicitud.revisionEntrega && selectedSolicitud.revisionEntrega[selectedArticulo.articulo];
            // Sólo deshabilitar si ya existe la revisión del tipo actual y el usuario no es admin
            const disabled = rev && rev[reviewType] && !isAdmin;
            return (
              <Box sx={{ 
                p: 2, 
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1a202c' : '#fafafa', 
                borderRadius: 2, 
                boxShadow: theme => theme.palette.mode === 'dark' 
                  ? '0 6px 18px rgba(0,0,0,0.3)' 
                  : '0 6px 18px rgba(0,0,0,0.06)',
                border: theme => theme.palette.mode === 'dark' ? '1px solid #4a5568' : 'none'
              }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={8}>
                    <Typography variant="subtitle2">Evento:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{selectedSolicitud.evento}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Chip label={reviewType === 'entrega' ? 'Modo: Entrega' : 'Modo: Recepción'} color="success" variant="outlined" />
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Solicitante:</Typography>
                    <Typography>{(() => {
                      const s = solicitantes.find(x => x.id === selectedSolicitud.solicitante);
                      return s ? s.nombre : selectedSolicitud.solicitante;
                    })()}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Artículo:</Typography>
                    <Typography>{(() => {
                      const art = articulos.find(a => a.id === selectedArticulo.articulo);
                      return art ? art.nombre : selectedArticulo.articulo;
                    })()} ({selectedArticulo.cantidad})</Typography>
                  </Grid>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={<Checkbox checked={reviewType === 'recepcion'} onChange={() => setReviewType(r => r === 'entrega' ? 'recepcion' : 'entrega')} />}
                      label={"Modo: " + (reviewType === 'entrega' ? 'Entrega' : 'Recepción')}
                    />
                  </Grid>
                  <Grid container spacing={2}>
                    {itemsRevision.map(item => (
                        <Grid item xs={12} sm={6} key={item.key}>
                          <Paper variant="outlined" sx={{ 
                            p: 1, 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' }, 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            bgcolor: theme => theme.palette.mode === 'dark' ? '#2d3748' : 'background.paper',
                            borderColor: theme => theme.palette.mode === 'dark' ? '#4a5568' : 'rgba(0,0,0,0.12)'
                          }}>
                            <Box sx={{ pr: 2, minWidth: { xs: 'auto', sm: 120 }, width: { xs: '100%', sm: 'auto' } }}>
                              <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{item.label}</Typography>
                            </Box>
                          <Box>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                              <Tooltip title="Buen estado">
                                <IconButton
                                  size="small"
                                  onClick={() => !disabled && handleCheck(item.key, true)}
                                  sx={{
                                    border: theme => `1px solid ${theme.palette.mode === 'dark' ? '#4a5568' : 'rgba(0,0,0,0.12)'}`,
                                    bgcolor: revision[item.key] === true 
                                      ? (theme => theme.palette.mode === 'dark' ? '#2d5016' : '#e6f4ea')
                                      : 'transparent',
                                    color: revision[item.key] === true 
                                      ? (theme => theme.palette.mode === 'dark' ? '#68d391' : '#2e7d32')
                                      : theme => theme.palette.text.primary,
                                    width: 40,
                                    height: 32,
                                  }}
                                >
                                  <CheckCircleOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Deficiente">
                                <IconButton
                                  size="small"
                                  onClick={() => !disabled && handleCheck(item.key, false)}
                                  sx={{
                                    border: theme => `1px solid ${theme.palette.mode === 'dark' ? '#4a5568' : 'rgba(0,0,0,0.12)'}`,
                                    bgcolor: revision[item.key] === false 
                                      ? (theme => theme.palette.mode === 'dark' ? '#5d1a1a' : '#ffe6ea')
                                      : 'transparent',
                                    color: revision[item.key] === false 
                                      ? (theme => theme.palette.mode === 'dark' ? '#f56565' : '#c62828')
                                      : theme => theme.palette.text.primary,
                                    width: 40,
                                    height: 32,
                                  }}
                                >
                                  <ErrorOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Box>
                        </Paper>
                        {revision[item.key] === false && (
                          <Box sx={{ mt: 1, width: '100%' }}>
                            <TextField
                              label="Comentario"
                              value={comentarios[item.key] || ""}
                              onChange={e => !disabled && handleComentario(item.key, e.target.value)}
                              fullWidth
                              margin="dense"
                              disabled={disabled}
                            />
                          </Box>
                        )}
                      </Grid>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Fecha de entrega"
                      type="date"
                      value={fechaEntrega || ""}
                      onChange={e => !disabled && setFechaEntrega(e.target.value)}
                      fullWidth
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      disabled={disabled}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Hora de entrega"
                      type="time"
                      value={horaEntrega || ""}
                      onChange={e => !disabled && setHoraEntrega(e.target.value)}
                      fullWidth
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      disabled={disabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Nombre de la persona a quien se entrega"
                      value={entregadoA}
                      onChange={e => !disabled && setEntregadoA(e.target.value)}
                      fullWidth
                      margin="normal"
                      disabled={disabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Nombre del Operario"
                      value={operarioNombre}
                      onChange={e => !disabled && setOperarioNombre(e.target.value)}
                      fullWidth
                      margin="normal"
                      disabled={disabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Teléfono del Operario"
                      value={operarioTelefono}
                      onChange={e => !disabled && setOperarioTelefono(e.target.value)}
                      fullWidth
                      margin="normal"
                      disabled={disabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Observaciones adicionales"
                      value={observaciones}
                      onChange={e => !disabled && setObservaciones(e.target.value)}
                      fullWidth
                      margin="normal"
                      multiline
                      minRows={3}
                      disabled={disabled}
                    />
                  </Grid>
                  {(() => {
                    const ahora = new Date();
                    const finReserva = new Date(selectedSolicitud.fechaFin + 'T' + selectedSolicitud.horaFin);
                    const puedeLiberar = ahora < finReserva && reviewType === 'entrega';
                    return puedeLiberar ? (
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={liberarReserva}
                              onChange={e => setLiberarReserva(e.target.checked)}
                              disabled={disabled}
                            />
                          }
                          label="Liberar reserva (entrega antes del tiempo de reserva)"
                        />
                      </Grid>
                    ) : null;
                  })()}
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'normal' }}>
                      Quien está solicitando operar el equipo hidráulico en forma de préstamo o alquiler al Centro de Convenciones de Costa Rica, da fé de que posee la capacitación y habilidades para operar este equipo en forma segura, y se compromete a respetar y acatar las normas de seguridad ocupacional y que además asume toda responsabilidad derivada de su operación ante cualquier daño físico o material que pueda causar. En consecuencia declara libre de toda responsabilidad a Grupo Heroica Volio y Trejos S.A. por cualquier hecho o circunstancia que se presente, tanto en el desplazamiento como en el desarrollo de la actividad, que pueda comprometer la integridad física y/o patrimonial.
                    </Typography>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Firma del Operario (Recepción y Responsabilidad):</Typography>
                    <Box sx={{ 
                      border: theme => `1px solid ${theme.palette.mode === 'dark' ? '#4a5568' : '#e0e0e0'}`, 
                      borderRadius: 2, 
                      width: '100%', 
                      maxWidth: 560,
                      height: 140, 
                      background: theme => theme.palette.mode === 'dark' ? '#2d3748' : '#fff', 
                      mb: 1, 
                      boxShadow: theme => theme.palette.mode === 'dark' 
                        ? 'inset 0 1px 3px rgba(0,0,0,0.2)' 
                        : 'inset 0 1px 3px rgba(0,0,0,0.04)',
                      overflow: 'hidden'
                    }}>
                      {disabled && operarioFirma ? (
                        <img src={operarioFirma} alt="Firma Operario" style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain',
                          borderRadius: 8, 
                          background: '#fff',
                          border: '1px solid #e0e0e0'
                        }} />
                      ) : (
                        <Box sx={{ width: '100%', height: '100%' }}>
                          <React.Suspense fallback={<div>Cargando firma...</div>}>
                            <SignatureCanvas
                              ref={operarioSigCanvasRef}
                              penColor="#00830e"
                              backgroundColor="#fff"
                              canvasProps={{ 
                                width: 520, 
                                height: 140, 
                                style: { 
                                  width: '100%',
                                  height: 140,
                                  borderRadius: 8, 
                                  background: '#fff' 
                                } 
                              }}
                              onEnd={() => setOperarioFirma(operarioSigCanvasRef.current ? operarioSigCanvasRef.current.getCanvas().toDataURL("image/png") : "")}
                            />
                          </React.Suspense>
                        </Box>
                      )}
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                      {!disabled && <Button onClick={() => { operarioSigCanvasRef.current.clear(); setOperarioFirma(""); }} size="small" variant="outlined">Limpiar firma operario</Button>}
                      {operarioFirma && !disabled && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">Vista previa firma operario:</Typography>
                          <img src={operarioFirma} alt="Firma Operario" style={{ 
                            width: 180, 
                            maxWidth: '100%',
                            border: '1px solid #eee', 
                            background: '#fff',
                            borderRadius: 4,
                            objectFit: 'contain'
                          }} />
                        </Box>
                      )}
                    </Stack>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Firma del Responsable:</Typography>
                    <Box sx={{ 
                      border: theme => `1px solid ${theme.palette.mode === 'dark' ? '#4a5568' : '#e0e0e0'}`, 
                      borderRadius: 2, 
                      width: '100%', 
                      maxWidth: 560,
                      height: 140, 
                      background: theme => theme.palette.mode === 'dark' ? '#2d3748' : '#fff', 
                      mb: 1, 
                      boxShadow: theme => theme.palette.mode === 'dark' 
                        ? 'inset 0 1px 3px rgba(0,0,0,0.2)' 
                        : 'inset 0 1px 3px rgba(0,0,0,0.04)',
                      overflow: 'hidden'
                    }}>
                      {disabled && firma ? (
                        <img src={firma} alt="Firma" style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain',
                          borderRadius: 8, 
                          background: '#fff',
                          border: '1px solid #e0e0e0'
                        }} />
                      ) : (
                        <Box sx={{ width: '100%', height: '100%' }}>
                          <React.Suspense fallback={<div>Cargando firma...</div>}>
                            <SignatureCanvas
                              ref={sigCanvasRef}
                              penColor="#00830e"
                              backgroundColor="#fff"
                              canvasProps={{ 
                                width: 520, 
                                height: 140, 
                                style: { 
                                  width: '100%',
                                  height: 140,
                                  borderRadius: 8, 
                                  background: '#fff' 
                                } 
                              }}
                              onEnd={() => setFirma(sigCanvasRef.current ? sigCanvasRef.current.getCanvas().toDataURL("image/png") : "")}
                            />
                          </React.Suspense>
                        </Box>
                      )}
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                      {!disabled && <Button onClick={() => { sigCanvasRef.current.clear(); setFirma(""); }} size="small" variant="outlined">Limpiar firma</Button>}
                      {firma && !disabled && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">Vista previa:</Typography>
                          <img src={firma} alt="Firma" style={{ 
                            width: 180, 
                            maxWidth: '100%',
                            border: '1px solid #eee', 
                            background: '#fff',
                            borderRadius: 4,
                            objectFit: 'contain'
                          }} />
                        </Box>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
                
              </Box>
            );
          })()}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
          {/* Historial: tabla separada fuera del contenedor principal de revisión */}
          {selectedSolicitud && selectedArticulo && (
            <Paper variant="outlined" sx={{ 
              mt: 3, 
              p: 2,
              bgcolor: theme => theme.palette.mode === 'dark' ? '#1a202c' : 'background.paper',
              borderColor: theme => theme.palette.mode === 'dark' ? '#4a5568' : 'rgba(0,0,0,0.12)',
              width: '100%',
              overflowX: 'auto'
            }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Historial de revisiones</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Usuario</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Firma</TableCell>
                      <TableCell>Observaciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const revRoot = selectedSolicitud && selectedSolicitud.revisionEntrega && selectedSolicitud.revisionEntrega[selectedArticulo.articulo];
                      if (!revRoot) return (
                        <TableRow><TableCell colSpan={5}><Typography variant="caption">No hay historial disponible.</Typography></TableCell></TableRow>
                      );
                      const rows = [];
                      if (revRoot.entrega) rows.push({ tipo: 'Entrega', data: revRoot.entrega, quien: revRoot.entrega.entregadoA || revRoot.entrega.creadoPor || '' , fecha: revRoot.entrega.fechaEntrega || revRoot.entrega.creadoEn || '' });
                      if (revRoot.recepcion) rows.push({ tipo: 'Recepción', data: revRoot.recepcion, quien: revRoot.recepcion.entregadoA || revRoot.recepcion.creadoPor || '' , fecha: revRoot.recepcion.fechaEntrega || revRoot.recepcion.creadoEn || '' });
                      return rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.tipo}</TableCell>
                          <TableCell>{r.quien}</TableCell>
                          <TableCell>{r.fecha ? new Date(r.fecha).toLocaleString() : ''}</TableCell>
                          <TableCell>{r.data && r.data.firma ? <img src={r.data.firma} alt="firma" style={{ width: 120, maxWidth: '100%', height: 'auto' }} /> : ''}</TableCell>
                          <TableCell>{r.data && r.data.observaciones ? r.data.observaciones : ''}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: 2,
          bgcolor: theme => theme.palette.mode === 'dark' ? '#2d3748' : 'background.paper',
          borderTop: theme => `1px solid ${theme.palette.mode === 'dark' ? '#4a5568' : '#eee'}`
        }}>
          <Button onClick={() => setOpenModal(false)} variant="outlined">Cancelar</Button>
          {(function(){
            // Mostrar botón Guardar sólo si:
            // - no hay revisión guardada del tipo actual para este artículo, o
            // - el usuario es admin (permite reescribir)
            if (!selectedSolicitud || !selectedArticulo) return null;
            const revRoot = selectedSolicitud.revisionEntrega && selectedSolicitud.revisionEntrega[selectedArticulo.articulo];
            const existsForType = revRoot && revRoot[reviewType];
            if (existsForType && !isAdmin) return null;
            return (<Button onClick={handleGuardarRevision} variant="contained" sx={{ bgcolor: '#00830e', color: '#fff' }}>Guardar revisión</Button>);
          })()}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Entregas;
