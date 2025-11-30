import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Select, MenuItem, TextField, Tooltip
} from "@mui/material";
import { CheckCircle, Save, PlusOne, Delete as DeleteIcon } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, onValue, update, push, remove } from "firebase/database";
import { sendSolicitudReparacionEmail, sendEntregaActivosEmail } from "../utils/email";


function Reparacion() {
  const { user, userData } = useAuth();
  const userEmail = userData?.email || user?.email;
  // Normalizar rol para evitar problemas de mayúsculas/espacios y variantes
  const role = userData?.rol?.toString().trim().toLowerCase() || '';
  console.log('[Reparacion] Component initialized. userData:', userData, 'userEmail:', userEmail, 'normalizedRole:', role);
  const canEditTable = role === 'infraestructura' || role === 'administrador' || role === 'infra';
  const canAddItems = role === 'areas' || role === 'administrador' || role === 'áreas' || role === 'area';
  // Visibilidad basada en autenticación (se usa `user`/`userData` directamente donde haga falta)
  const [articulos, setArticulos] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  // Nuevo item a agregar individualmente
  const [nuevo, setNuevo] = useState({
    articuloId: "",
    numActivo: "",
    numOT: "",
    estatus: "Evaluación"
  });
  // Items pendientes de agregar en lote
  const [nuevosItems, setNuevosItems] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // Ediciones locales de grupos antes de aprobar
  const [groupEdits, setGroupEdits] = useState({});

  // Cargar inventario y categorías
  useEffect(() => {
    const invRef = ref(db, "inventario");
    const catRef = ref(db, "categorias");
    const repRef = ref(db, "reparaciones");
    const unsubInv = onValue(invRef, snap => {
      const data = snap.val() || {};
      setArticulos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    const unsubRep = onValue(repRef, snap => {
      const data = snap.val() || {};
      setReparaciones(Object.entries(data).map(([id, value]) => ({ firebaseId: id, ...value })));
    });
    return () => {
      unsubInv();
      unsubCat();
      unsubRep();
    };
  }, []);

      // Añadir item individualmente a la tabla temporal
      const handleAddItem = () => {
        setErrorMsg("");
        const { articuloId, numActivo, numOT, estatus } = nuevo;
        if (!articuloId || !numActivo) {
          setErrorMsg("Seleccione artículo y número de activo.");
          return;
        }
        // Verificar duplicado de numActivo
        if (nuevosItems.some(it => it.numActivo === numActivo)) {
          setErrorMsg("Este número de activo ya está en la lista.");
          return;
        }
        const art = articulos.find(a => a.id === articuloId);
        if (!art) return;
        // Agregar a lista local
        setNuevosItems(items => [...items, { 
          articuloId,
          nombre: art.nombre,
          categoria: art.categoria,
          numActivo,
          numOT,
          estatus
        }]);
        // Reset campos
        setNuevo({ articuloId: "", numActivo: "", numOT: "", estatus: "Evaluación" });
      };
      // Guardar todos los items de reparación
      const handleSaveReparaciones = async () => {
        console.log('[Reparacion] handleSaveReparaciones invoked with nuevosItems:', nuevosItems);
        // Persistir cada nuevo ítem
        const pushPromises = nuevosItems.map(item => {
          const art = articulos.find(a => a.id === item.articuloId);
          if (!art) return Promise.resolve();
          return push(ref(db, "reparaciones"), {
            id: item.articuloId,
            nombre: item.nombre,
            categoria: item.categoria,
            cantidad: art.cantidad,
            revision: 1,
            estatus: item.estatus,
            numActivo: item.numActivo,
            numOT: item.numOT,
            activosReparados: 0,
            activoDesechado: 0,
            entregaPendiente: false
          });
        });
        await Promise.all(pushPromises);
        // Limpiar lista temporal
        setNuevosItems([]);
        // Notificación por correo si es rol Areas
        if (userData?.rol === 'areas') {
          console.log('[Reparacion] Trigger sendSolicitudReparacionEmail for role Areas with email:', userEmail);
          sendSolicitudReparacionEmail(userEmail).catch(console.error);
        }
      };

  // Cambiar estatus o activos reparados y persistir en Firebase
  // La columna Revisión sincroniza con Inventario (módulo Inventario)
  const handleChangeReparacion = (idx, field, value) => {
    const rep = reparaciones[idx];
    // Persistir cambio en Firebase
    if (rep.firebaseId) {
      update(ref(db, `reparaciones/${rep.firebaseId}`), { [field]: value });
    }
    // Si cambia revisión, sincronizar con inventario
    if (field === 'revision') {
      update(ref(db, `inventario/${rep.id}`), { revision: Number(value) });
    }
    // Actualizar estado local
    setReparaciones(reps => reps.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  // Aprobar reparación
  const handleAprobar = async (idx) => {
    setErrorMsg("");
    const rep = reparaciones[idx];
    // Solo permitir aprobación si está Finalizado
    if (rep.estatus !== 'Finalizado') {
      setErrorMsg('Solo se pueden aprobar reparaciones con estado Finalizado.');
      return;
    }
    const art = articulos.find(a => a.id === rep.id);
    if (!art) return;
    // Cantidades a procesar
    const entregados = Number(rep.activosReparados) || 0;
    const desechados = Number(rep.activoDesechado) || 0;
    
    // Calcular nueva revisión y cantidad
    const newRevision = Math.max(0, Number(rep.revision) - entregados);
    const newCantidad = Math.max(0, Number(art.cantidad) - desechados);
    
    // Actualizar inventario
    update(ref(db, `inventario/${rep.id}`), { ...art, cantidad: newCantidad });
    
    // Enviar reparados a entregaActivos si hay entregados
    if (entregados > 0) {
      // Enviar reparados al nodo de entrega e excluir la propiedad firebaseId original
      const { firebaseId, ...repData } = rep;
      push(ref(db, "entregaActivos"), {
        ...repData,
        enviados: entregados,
        enviadoEn: new Date().toISOString(),
        reparacionFirebaseId: firebaseId
      });
      // Marcar entrega pendiente en reparaciones
      if (rep.firebaseId) {
        update(ref(db, `reparaciones/${rep.firebaseId}`), { entregaPendiente: true });
      }
    }
    
    // Registrar en historial
    push(ref(db, "historialReparaciones"), {
      id: rep.id,
      nombre: rep.nombre,
      categoria: rep.categoria,
      cantidad: newCantidad,
      revision: newRevision,
      estatus: rep.estatus,
      activosReparados: entregados,
      activoDesechado: desechados,
      aprobadoEn: new Date().toISOString()
    });
    
    // Actualizar o eliminar registro de reparación según pendientes
    if (newRevision <= 0) {
      // No quedan en revisión => eliminar
      if (rep.firebaseId) remove(ref(db, `reparaciones/${rep.firebaseId}`));
      setReparaciones(reps => reps.filter((r, i) => i !== idx));
    } else {
      // Actualizar revisión pendiente
      if (rep.firebaseId) {
        update(ref(db, `reparaciones/${rep.firebaseId}`), { revision: newRevision, activosReparados: 0, activoDesechado: 0 });
      }
      setReparaciones(reps => reps.map((r, i) => i === idx ? { ...r, revision: newRevision, activosReparados: 0, activoDesechado: 0 } : r));
    }
    // Notificación por correo si es rol Infraestructura
    if (userData?.rol === 'infraestructura') {
      console.log('[Reparacion] Trigger sendEntregaActivosEmail for role Infraestructura');
      sendEntregaActivosEmail().catch(console.error);
    }
  };
  // Agrupar reparaciones por artículo para la tabla de aprobación
  const groupedReparaciones = Object.values(
    reparaciones.reduce((acc, rep, idx) => {
      const key = rep.id;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          nombre: rep.nombre,
          categoria: rep.categoria,
          estatus: rep.estatus,
          cantidad: articulos.find(a => a.id === rep.id)?.cantidad || 0,
          revision: rep.revision || 0,
          activosReparados: rep.activosReparados || 0,
          activoDesechado: rep.activoDesechado || 0,
          entregaPendiente: rep.entregaPendiente || false,
          miembros: [idx]
        };
      } else {
        acc[key].revision += rep.revision || 0;
        acc[key].activosReparados += rep.activosReparados || 0;
        acc[key].activoDesechado += rep.activoDesechado || 0;
        acc[key].entregaPendiente = acc[key].entregaPendiente || rep.entregaPendiente;
        acc[key].miembros.push(idx);
      }
      return acc;
    }, {})
  );
  // Inicializar ediciones locales cuando cambien los grupos
  useEffect(() => {
    const defaults = {};
    groupedReparaciones.forEach(g => {
      if (!groupEdits[g.id]) {
        defaults[g.id] = {
          activosReparados: g.activosReparados || 0,
          activoDesechado: g.activoDesechado || 0
        };
      }
    });
    if (Object.keys(defaults).length > 0) {
      setGroupEdits(prev => ({ ...prev, ...defaults }));
    }
  }, [groupedReparaciones]);
  // Botón de aprobar grupo
  const handleGroupAprobar = (group) => {
    const edits = groupEdits[group.id] || {};
    const activosReparados = Number(edits.activosReparados) || 0;
    const activoDesechado = Number(edits.activoDesechado) || 0;
    
    // Solo procesar el primer miembro del grupo para evitar duplicados
    const rep = reparaciones[group.miembros[0]];
    const art = articulos.find(a => a.id === rep.id);
    if (!art) return;
    
    const totalRevisionGrupo = group.revision || 0;
    
    // NO ALTERAR las cantidades en inventario hasta que se procese en EntregaActivos
    // Solo marcar como finalizado y enviar TODOS los items en revisión a EntregaActivos
    
    // Marcar todos los registros del grupo como finalizados
    group.miembros.forEach(idx => {
      const repMember = reparaciones[idx];
      if (repMember.firebaseId) {
        update(ref(db, `reparaciones/${repMember.firebaseId}`), {
          revision: 1, // Mantener revisión
          activosReparados: activosReparados,
          activoDesechado: activoDesechado,
          estatus: 'Finalizado', // Cambiar a Finalizado
          entregaPendiente: true,
          fechaFinalizacion: new Date().toISOString()
        });
      }
    });
    
    // Enviar TODOS los ítems en revisión a entregaActivos (no solo los reparados)
    // Esto incluye reparados + desechados + sobrantes
    const { firebaseId, ...repData } = rep;
    for (let i = 0; i < totalRevisionGrupo; i++) {
      // Determinar el tipo de cada ítem basado en los números especificados
      let tipoItem = 'sobrante'; // Por defecto
      if (i < activosReparados) {
        tipoItem = 'reparado';
      } else if (i < (activosReparados + activoDesechado)) {
        tipoItem = 'desecho';
      }
      
      // Asignar cada ítem a un registro específico del grupo para mantener la referencia
      const memberIndex = i % group.miembros.length;
      const memberFirebaseId = reparaciones[group.miembros[memberIndex]].firebaseId;
      
      push(ref(db, "entregaActivos"), {
        ...repData,
        cantidad: 1, // Cada registro es un activo individual
        enviados: 1,  // Cada registro representa 1 activo enviado
        enviadoEn: new Date().toISOString(),
        reparacionFirebaseId: memberFirebaseId, // Usar el firebaseId del miembro específico
        estatusRevision: 'Pendiente',
        procesadoDesde: 'reparacion',
        indiceActivo: i + 1, // Para identificar cada activo individual
        tipoEsperado: tipoItem, // Información para el checklist
        activosReparadosEsperados: activosReparados,
        activosDesechadosEsperados: activoDesechado,
        totalEnviados: totalRevisionGrupo,
        numActivo: `${rep.numActivo}-${i + 1}` // Generar número único para cada activo
      });
    }
    
    // Limpiar ediciones locales
    setGroupEdits(prev => ({
      ...prev,
      [group.id]: { activosReparados: 0, activoDesechado: 0 }
    }));
  };
  // Cambiar estatus de grupo: aplica a cada miembro
  const handleGroupChangeEstatus = (group, newEstatus) => {
    group.miembros.forEach(idx => handleChangeReparacion(idx, 'estatus', newEstatus));
  };
  // Cambiar valor numérico en el primer miembro del grupo
  const handleGroupFieldChange = (group, field, value) => {
    if (group.miembros.length) {
      handleChangeReparacion(group.miembros[0], field, value);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Reparación de Mobiliario</Typography>
      {canAddItems && (
        <>  {/* Formulario de adición individual solo para Areas */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {errorMsg && <Typography color="error" sx={{ minWidth: 250 }}>{errorMsg}</Typography>}
          {/* Campo de búsqueda de artículo */}
          <TextField
            label="Buscar artículo"
            size="large"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          {/* Selector de artículo filtrado */}
          <Select
            value={nuevo.articuloId}
            size="large"
            onChange={e => setNuevo(n => ({ ...n, articuloId: e.target.value }))}
            displayEmpty
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="" disabled>Seleccionar artículo</MenuItem>
            {articulos
              .filter(a => a.nombre.toLowerCase().includes(busqueda.toLowerCase()))
              .map(a => (
                <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>
              ))}
          </Select>
          <TextField
            label="Num. Activo"
            value={nuevo.numActivo}
            onChange={e => setNuevo(n => ({ ...n, numActivo: e.target.value }))}
            sx={{ width: 150 }}
          />
          <TextField
            label="Num. OT"
            value={nuevo.numOT}
            onChange={e => setNuevo(n => ({ ...n, numOT: e.target.value }))}
            sx={{ width: 150 }}
          />
          <Select
            value={nuevo.estatus}
            size="large"
            onChange={e => setNuevo(n => ({ ...n, estatus: e.target.value }))}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="Evaluación">Evaluación</MenuItem>
            <MenuItem value="Finalizado">Finalizado</MenuItem>
          </Select>
          <Button size="large" variant="contained" onClick={handleAddItem}>{<PlusOne />}Añadir item</Button>
        </Box>
        {/* Tabla temporal de nuevos items */}
        {nuevosItems.length > 0 && (
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Num. Activo</TableCell>
                  <TableCell>Num. OT</TableCell>
                  <TableCell>Estatus</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nuevosItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell>{categorias.find(c => c.id === item.categoria)?.nombre}</TableCell>
                    <TableCell>{item.numActivo}</TableCell>
                    <TableCell>{item.numOT}</TableCell>
                    <TableCell>{item.estatus}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => setNuevosItems(list => list.filter((_,i) => i !== idx))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
          <Button size="large" variant="contained" onClick={handleSaveReparaciones} sx={{ mb: 4 }}>{<Save />}Guardar Reparaciones</Button>
        </>
      )}
      {/* Tabla agrupada: editable solo para Infraestructura y Administrador */}
      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Cantidad</TableCell>
          <TableCell>
            <Tooltip title="Este valor sincroniza con la columna 'revisión' del Inventario" arrow>
              <span>Revisión</span>
            </Tooltip>
          </TableCell>
          {/* Nueva columna Estatus */}
          <TableCell>Estatus</TableCell>
          <TableCell>
            <Tooltip title="Solo aplicable cuando el estatus está en Finalizado" arrow>
              <span>Activos Reparados</span>
            </Tooltip>
          </TableCell>
          <TableCell>
            <Tooltip title="Solo aplicable cuando el estatus está en Finalizado" arrow>
              <span>Activo Desechado</span>
            </Tooltip>
          </TableCell>
              <TableCell>Entrega Pendiente</TableCell>
              <TableCell align="center">Aprobar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedReparaciones.map((group, idx) => (
              <TableRow key={idx}>
                <TableCell>{group.nombre}</TableCell>
                <TableCell>{categorias.find(c => c.id === group.categoria)?.nombre || ""}</TableCell>
                <TableCell>{group.cantidad}</TableCell>
                <TableCell>{group.revision}</TableCell>
                {/* Estatus editable en tabla agrupada */}
                <TableCell>
                  {canEditTable
                    ? <Select size="small" value={group.estatus} onChange={e => handleGroupChangeEstatus(group, e.target.value)}>
                        <MenuItem value="Evaluación">Evaluación</MenuItem>
                        <MenuItem value="Finalizado">Finalizado</MenuItem>
                      </Select>
                    : <span>{group.estatus}</span>}
                </TableCell>
                {/* Activos Reparados editable solo si Finalizado */}
                <TableCell>
                  {group.estatus === 'Finalizado'
                    ? (canEditTable
                        ? <TextField
                            size="small"
                            type="text"
                            inputProps={{ inputMode: 'numeric' }}
                            value={groupEdits[group.id]?.activosReparados ?? ''}
                            onChange={e => setGroupEdits(prev => ({ ...prev, [group.id]: { ...prev[group.id], activosReparados: e.target.value } }))}
                          />
                        : <span>{group.activosReparados}</span>)
                    : group.activosReparados}
                </TableCell>
                {/* Activo Desechado editable solo si Finalizado */}
                <TableCell>
                  {group.estatus === 'Finalizado'
                    ? (canEditTable
                        ? <TextField
                            size="small"
                            type="text"
                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                            value={groupEdits[group.id]?.activoDesechado ?? ''}
                            onChange={e => setGroupEdits(prev => ({ ...prev, [group.id]: { ...prev[group.id], activoDesechado: e.target.value } }))}
                          />
                        : <span>{group.activoDesechado}</span>)
                    : group.activoDesechado}
                </TableCell>
                <TableCell sx={{ 
                  color: group.entregaPendiente ? 'error.main' : 
                         (groupEdits[group.id]?.activosReparados > 0 && group.estatus === 'Finalizado') ? 'warning.main' : 'success.main' 
                }}>
                  {group.entregaPendiente ? "Pendiente" : 
                   (groupEdits[group.id]?.activosReparados > 0 && group.estatus === 'Finalizado') ? "Pendiente Aprobación" : "Recibido"}
                </TableCell>
                <TableCell align="center">
                  {canEditTable && (
                    <IconButton color="success" onClick={() => handleGroupAprobar(group)}>
                      <CheckCircle />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default Reparacion;
