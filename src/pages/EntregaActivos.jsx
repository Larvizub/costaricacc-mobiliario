import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue, update, push, remove } from "firebase/database";
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, 
  Grid, Card, CardContent
} from "@mui/material";

function EntregaActivos() {
  const [entregas, setEntregas] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState(null);
  const [selectedReparaciones, setSelectedReparaciones] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [checkedDesecho, setCheckedDesecho] = useState({});
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogMessage, setInfoDialogMessage] = useState('');

  // Component header will be updated in return statement

  useEffect(() => {
    const entregaRef = ref(db, "entregaActivos");
    
    const unsubEntrega = onValue(entregaRef, snap => {
      const data = snap.val() || {};
      
      // Agrupar entregas por artículo y solo mostrar las pendientes
      const agrupadas = Object.entries(data)
        .filter(([id, value]) => {
          return id !== 'undefined' && value && value.estatusRevision === 'Pendiente';
        })
        .reduce((acc, [id, value]) => {
          const key = value.id; // ID del artículo
          if (!acc[key]) {
            acc[key] = {
              id: key,
              nombre: value.nombre,
              categoria: value.categoria,
              cantidadTotal: value.cantidad, // Cantidad total del inventario (no sumar)
              activosReparados: 0, // Contar activos individuales reparados
              entregas: []
            };
          }
          // No sumar cantidad, mantener la del inventario
          acc[key].cantidadTotal = value.cantidad || acc[key].cantidadTotal;
          // Contar cada registro individual como 1 activo reparado
          acc[key].activosReparados += 1;
          acc[key].entregas.push({ firebaseId: id, ...value });
          return acc;
        }, {});
      
      setEntregas(Object.values(agrupadas));
    });

    return () => {
      unsubEntrega();
    };
  }, []);

  const handleOpenModal = (entrega) => {
    setSelectedEntrega(entrega);
    // Usar las entregas agrupadas en lugar de buscar reparaciones
    // Filtrar duplicados basados en firebaseId para evitar triplicación
    const uniqueEntregas = entrega.entregas.filter((item, index, self) => 
      index === self.findIndex(t => t.firebaseId === item.firebaseId)
    );
    setSelectedReparaciones(uniqueEntregas);
    
    // Inicializar checklist solo con entregas únicas
    const initialChecks = {};
    const initialDesecho = {};
    uniqueEntregas.forEach(ent => {
      initialChecks[ent.firebaseId] = ent.tipoEsperado === 'reparado';
      initialDesecho[ent.firebaseId] = ent.tipoEsperado === 'desecho';
    });
    setCheckedItems(initialChecks);
    setCheckedDesecho(initialDesecho);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedEntrega(null);
    setSelectedReparaciones([]);
    setCheckedItems({});
    setCheckedDesecho({});
  };

  const handleCheckItem = (reparacionId, checked) => {
    setCheckedItems(prev => ({
      ...prev,
      [reparacionId]: checked
    }));
    // Si se marca como reparado, desmarcar desecho
    if (checked) {
      setCheckedDesecho(prev => ({
        ...prev,
        [reparacionId]: false
      }));
    }
  };

  const handleCheckDesecho = (reparacionId, checked) => {
    setCheckedDesecho(prev => ({
      ...prev,
      [reparacionId]: checked
    }));
    // Si se marca como desecho, desmarcar reparado
    if (checked) {
      setCheckedItems(prev => ({
        ...prev,
        [reparacionId]: false
      }));
    }
  };

  const handleShowInfoDialog = (message) => {
    setInfoDialogMessage(message);
    setInfoDialogOpen(true);
  };

  const handleCloseInfoDialog = () => {
    setInfoDialogOpen(false);
    setInfoDialogMessage('');
  };

  const handleSaveRevision = async () => {
    if (!selectedEntrega) return;

    try {
      // Separar entregas por tipo
      const entregasReparadas = selectedReparaciones.filter(entrega => checkedItems[entrega.firebaseId]);
      const entregasDesecho = selectedReparaciones.filter(entrega => checkedDesecho[entrega.firebaseId]);
      const entregasSobrantes = selectedReparaciones.filter(entrega => 
        !checkedItems[entrega.firebaseId] && !checkedDesecho[entrega.firebaseId]
      );

      // Actualizar entregas reparadas
      const updateReparadasPromises = entregasReparadas.map(entrega => {
        return update(ref(db, `entregaActivos/${entrega.firebaseId}`), { 
          estatusRevision: 'Reparado',
          fechaProcesado: new Date().toISOString(),
          tipoProcesado: 'reparado'
        });
      });

      // Actualizar entregas para desecho
      const updateDesechoPromises = entregasDesecho.map(entrega => {
        return update(ref(db, `entregaActivos/${entrega.firebaseId}`), { 
          estatusRevision: 'Desecho',
          fechaProcesado: new Date().toISOString(),
          tipoProcesado: 'desecho'
        });
      });

      // Regresar entregas sobrantes al módulo de Reparación
      const returnPromises = entregasSobrantes.map(async (entrega) => {
        // Marcar como devuelto en entregaActivos
        await update(ref(db, `entregaActivos/${entrega.firebaseId}`), { 
          estatusRevision: 'Devuelto',
          fechaDevuelto: new Date().toISOString(),
          tipoProcesado: 'sobrante'
        });

        // Buscar el registro original en reparaciones para actualizarlo (no crear uno nuevo)
        if (entrega.reparacionFirebaseId) {
          // Actualizar el registro original en reparaciones
          await update(ref(db, `reparaciones/${entrega.reparacionFirebaseId}`), {
            estatus: 'Evaluación', // Volver a Evaluación
            activosReparados: 0,   // Resetear a 0
            activoDesechado: 0,    // Resetear a 0
            entregaPendiente: false,
            devueltoDesdeEntrega: true,
            fechaDevolucion: new Date().toISOString(),
            motivoDevolucion: 'Sobrante de entrega - requiere nueva evaluación'
          });
          
          console.log(`Registro ${entrega.reparacionFirebaseId} devuelto a Evaluación`);
        } else {
          // Si no hay referencia al registro original, crear uno nuevo
          const { firebaseId, reparacionFirebaseId, enviados, enviadoEn, estatusRevision, procesadoDesde, indiceActivo, tipoEsperado, activosReparadosEsperados, activosDesechadosEsperados, totalEnviados, ...repData } = entrega;
          
          // Limpiar el número de activo para evitar duplicados con sufijos
          const baseNumActivo = entrega.numActivo.replace(/-\d+$/, '');
          
          const newRepData = {
            ...repData,
            numActivo: baseNumActivo, // Usar número base sin sufijo
            revision: 1, // Cada activo devuelto cuenta como 1 en revisión
            estatus: 'Evaluación',
            activosReparados: 0,
            activoDesechado: 0,
            entregaPendiente: false,
            devueltoEn: new Date().toISOString(),
            motivoDevolucion: 'Sobrante de entrega'
          };
          
          await push(ref(db, "reparaciones"), newRepData);
        }
      });

      // Eliminar registros procesados (reparados y desecho) de la tabla de Reparación
      const removeProcessedPromises = [...entregasReparadas, ...entregasDesecho].map(async (entrega) => {
        if (entrega.reparacionFirebaseId) {
          // Eliminar completamente el registro de reparaciones
          await remove(ref(db, `reparaciones/${entrega.reparacionFirebaseId}`));
          console.log(`Registro ${entrega.reparacionFirebaseId} eliminado de Reparación (${entrega.tipoProcesado || 'procesado'})`);
        }
      });

      // Ejecutar todas las operaciones
      await Promise.all([...updateReparadasPromises, ...updateDesechoPromises, ...returnPromises, ...removeProcessedPromises]);

      // Actualizar inventario final basado en lo procesado
      const inventarioRef = ref(db, `inventario/${selectedEntrega.id}`);
      onValue(inventarioRef, (snapshot) => {
        const inventarioData = snapshot.val();
        if (inventarioData) {
          // Lógica correcta de actualización:
          // 1. Reparados: Se restan de revisión (salen del sistema como exitosos)
          // 2. Desecho: Se restan de cantidad Y de revisión (se eliminan físicamente)
          // 3. Sobrantes: Se quedan en revisión (solo la cantidad de sobrantes)
          
          const cantidadActual = Number(inventarioData.cantidad) || 0;
          const revisionActual = Number(inventarioData.revision) || 0;
          
          // Solo los desechados se restan de cantidad (se eliminan físicamente)
          const newCantidad = Math.max(0, cantidadActual - entregasDesecho.length);
          
          // La nueva revisión debe ser SOLO los sobrantes (no restar del total)
          const newRevision = entregasSobrantes.length;
          
          update(inventarioRef, { 
            cantidad: newCantidad,
            revision: newRevision 
          }).then(() => {
            console.log(`Inventario actualizado correctamente:`);
            console.log(`- Cantidad: ${cantidadActual} -> ${newCantidad} (restados ${entregasDesecho.length} desechados)`);
            console.log(`- Revisión: ${revisionActual} -> ${newRevision} (quedan ${entregasSobrantes.length} sobrantes en revisión)`);
          });
        }
      }, { onlyOnce: true });

      console.log(`Procesamiento completado: ${entregasReparadas.length} reparados, ${entregasDesecho.length} desechados, ${entregasSobrantes.length} devueltos`);

      // Registrar en historial
      if (entregasReparadas.length > 0) {
        const historialData = entregasReparadas.map(entrega => ({
          firebaseId: entrega.firebaseId,
          reparacionFirebaseId: entrega.reparacionFirebaseId,
          numActivo: entrega.numActivo,
          cantidad: 1,
          enviadoEn: entrega.enviadoEn,
          procesadoEn: new Date().toISOString(),
          tipo: 'reparado'
        }));

        await push(ref(db, "historialProcesamiento"), {
          articuloId: selectedEntrega.id,
          nombre: selectedEntrega.nombre,
          categoria: selectedEntrega.categoria,
          totalReparado: entregasReparadas.length,
          totalDesecho: entregasDesecho.length,
          totalDevuelto: entregasSobrantes.length,
          entregasProcesadas: historialData,
          fechaProcesamiento: new Date().toISOString(),
          procesadoPor: "Sistema"
        });
      }

      // Mensaje informativo
      const mensajeReparados = entregasReparadas.length > 0 ? `${entregasReparadas.length} activos reparados. ` : '';
      const mensajeDesecho = entregasDesecho.length > 0 ? `${entregasDesecho.length} activos para desecho. ` : '';
      const mensajeDevueltos = entregasSobrantes.length > 0 ? `${entregasSobrantes.length} activos devueltos a Reparación.` : '';
      
      handleCloseModal();
      handleShowInfoDialog(mensajeReparados + mensajeDesecho + mensajeDevueltos);
    } catch (error) {
      console.error('Error guardando revisión:', error);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Entrega de Activos Reparados</Typography>
      </Box>
      
      <TableContainer component={Paper} sx={theme => ({ borderRadius: 3, boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)' })}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Activos Reparados</TableCell>
              <TableCell align="center">Revisar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entregas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary">
                    No hay activos reparados pendientes de entrega
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              entregas.map(entrega => (
                <TableRow key={entrega.id}>
                  <TableCell>{entrega.nombre}</TableCell>
                  <TableCell>{entrega.cantidadTotal}</TableCell>
                  <TableCell>{entrega.activosReparados}</TableCell>
                  <TableCell align="center">
                    <Button 
                      variant="contained" 
                      onClick={() => handleOpenModal(entrega)}
                      sx={{ bgcolor: '#00830e' }}
                    >
                      Revisar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de revisión */}
      <Dialog 
        open={openModal} 
        onClose={handleCloseModal} 
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
          Revisión de Entrega - {selectedEntrega?.nombre}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedEntrega && (
            <Box>
              {/* Datos generales */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Datos Generales</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography><strong>Nombre:</strong> {selectedEntrega.nombre}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography><strong>Cantidad Total en Inventario:</strong> {selectedEntrega.cantidadTotal}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography><strong>Activos Reparados Esperados:</strong> {selectedReparaciones[0]?.activosReparadosEsperados || 0}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography><strong>Total de Activos Enviados:</strong> {selectedEntrega.activosReparados}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Tabla de artículos individuales */}
              <Typography variant="h6" gutterBottom>Artículos para Revisión</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                • Marque los activos como "Reparado" o "Desecho" según corresponda
                • Los activos no marcados regresarán automáticamente al módulo de Reparación como sobrantes
              </Typography>
              
              {/* Contador dinámico */}
              <Card sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
                <CardContent sx={{ py: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Typography variant="body2" color="success.main">
                        <strong>Reparados: {Object.values(checkedItems).filter(Boolean).length}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body2" color="error.main">
                        <strong>Desecho: {Object.values(checkedDesecho).filter(Boolean).length}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Sobrantes: {selectedReparaciones.length - Object.values(checkedItems).filter(Boolean).length - Object.values(checkedDesecho).filter(Boolean).length}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body2">
                        <strong>Total: {selectedReparaciones.length}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Num. Activo</TableCell>
                      <TableCell>Num. OT</TableCell>
                      <TableCell>Estado Actual</TableCell>
                      <TableCell align="center">Reparado</TableCell>
                      <TableCell align="center">Desecho</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedReparaciones.map((entrega, index) => {
                      // Determinar el estado actual basado en los checkboxes
                      const estadoActual = checkedItems[entrega.firebaseId] ? 'reparado' : 
                                         checkedDesecho[entrega.firebaseId] ? 'desecho' : 
                                         'sobrante';
                      
                      return (
                        <TableRow key={`${entrega.firebaseId}-${index}`}>
                          <TableCell>{entrega.nombre}</TableCell>
                          <TableCell>{entrega.numActivo}</TableCell>
                          <TableCell>{entrega.numOT || '-'}</TableCell>
                          <TableCell>
                            <Typography 
                              color={
                                estadoActual === 'reparado' ? 'success.main' : 
                                estadoActual === 'desecho' ? 'error.main' : 
                                'text.secondary'
                              }
                              variant="body2"
                              sx={{ textTransform: 'capitalize' }}
                            >
                              {estadoActual}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox
                              checked={checkedItems[entrega.firebaseId] || false}
                              onChange={(e) => handleCheckItem(entrega.firebaseId, e.target.checked)}
                              color="success"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox
                              checked={checkedDesecho[entrega.firebaseId] || false}
                              onChange={(e) => handleCheckDesecho(entrega.firebaseId, e.target.checked)}
                              color="error"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseModal} sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveRevision}
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
            Procesar Revisión
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de notificación después del procesamiento */}
      <Dialog 
        open={infoDialogOpen} 
        onClose={handleCloseInfoDialog}
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
          Notificación
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography>{infoDialogMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCloseInfoDialog} 
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
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EntregaActivos;
