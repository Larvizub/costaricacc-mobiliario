import React, { useEffect, useState } from "react";
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

function HistorialRep() {
  const [historial, setHistorial] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    // Leer datos de recepciones procesadas desde historialProcesamiento
    const histRef = ref(db, "historialProcesamiento");
    const catRef = ref(db, "categorias");
    const unsubHist = onValue(histRef, snap => {
      const data = snap.val() || {};
      setHistorial(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    return () => {
      unsubHist();
      unsubCat();
    };
  }, []);

  const handleOpenDetail = (rep) => {
    setSelectedDetail(rep);
    setDetailDialogOpen(true);
  };
  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedDetail(null);
  };

  // Filtrar historial según búsqueda y categoría
  const filteredHistorial = historial.filter(rep => {
    const nombreCat = categorias.find(c => c.id === rep.categoria)?.nombre || "";
    const text = search.trim().toLowerCase();
    const matchesSearch = !text || rep.nombre.toLowerCase().includes(text) || nombreCat.toLowerCase().includes(text);
    const matchesCategory = !categoryFilter || rep.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Historial de Recepciones</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Buscar"
            variant="outlined"
            size="large"
            fullWidth
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth size="large">
            <InputLabel>Categoría</InputLabel>
            <Select
              label="Categoría"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <MenuItem value=""><em>Todos</em></MenuItem>
              {categorias.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Total Reparado</TableCell>
              <TableCell>Total Desecho</TableCell>
              <TableCell>Total Devuelto</TableCell>
              <TableCell>Fecha Procesamiento</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredHistorial.map((rep, idx) => (
              <TableRow key={rep.id + idx}>
                <TableCell>{rep.nombre}</TableCell>
                <TableCell>{categorias.find(c => c.id === rep.categoria)?.nombre || ""}</TableCell>
                <TableCell>{rep.totalReparado}</TableCell>
                <TableCell>{rep.totalDesecho}</TableCell>
                <TableCell>{rep.totalDevuelto}</TableCell>
                <TableCell>{rep.fechaProcesamiento ? new Date(rep.fechaProcesamiento).toLocaleString() : ""}</TableCell>
                <TableCell>
                  <Button variant="outlined" size="small" onClick={() => handleOpenDetail(rep)}>
                    Ver detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de detalle */}
      <Dialog open={detailDialogOpen} onClose={handleCloseDetail} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle de Recepción - {selectedDetail?.nombre}</DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Num. Activo</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Procesado En</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedDetail?.entregasProcesadas?.map((item, i) => (
                <TableRow key={item.firebaseId + i}>
                  <TableCell>{item.numActivo}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{item.tipo}</TableCell>
                  <TableCell>{item.procesadoEn ? new Date(item.procesadoEn).toLocaleString() : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default HistorialRep;
