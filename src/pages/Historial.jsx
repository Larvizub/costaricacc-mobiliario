import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, TablePagination
} from "@mui/material";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

function Historial() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitantes, setSolicitantes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

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
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              if (!filteredSolicitudes || filteredSolicitudes.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={7}><Typography variant="caption">No hay resultados.</Typography></TableCell>
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
                        sol.estado === 'autorizado' ? '#43a047' :
                        sol.estado === 'rechazado' ? '#e53935' :
                        sol.estado === 'pendiente' || !sol.estado ? '#fbc02d' :
                        '#90a4ae'
                    }}>
                      {sol.estado ? sol.estado.charAt(0).toUpperCase() + sol.estado.slice(1) : 'Pendiente'}
                    </span>
                  </TableCell>
                  <TableCell>{sol.observaciones}</TableCell>
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
    </Box>
  );
}

export default Historial;
