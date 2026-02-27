import React, { useEffect, useState } from "react";
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, TablePagination } from "@mui/material";
import { Description } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, onValue, get, query, orderByChild, startAt, endAt } from "firebase/database";
import { exportStyledXlsx } from "../utils/excelExport";

function HistorialRep() {
  const [historial, setHistorial] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ search: "", categoryFilter: "", dateFrom: "", dateTo: "" });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [page, setPage] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const rowsPerPage = 10;

  useEffect(() => {
    const catRef = ref(db, "categorias");
    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    return () => {
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
  const getRepTimestamp = (rep) => {
    const value = rep?.fechaProcesamiento;
    if (!value) return 0;

    if (typeof value === 'number') return value;

    const directTs = new Date(value).getTime();
    if (!Number.isNaN(directTs)) return directTs;

    if (typeof value === 'string') {
      const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (match) {
        const [, d, m, y, hh = '0', mm = '0', ss = '0'] = match;
        const normalized = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
        const parsedTs = new Date(normalized).getTime();
        if (!Number.isNaN(parsedTs)) return parsedTs;
      }
    }

    return 0;
  };

  const normalizeText = (value = "") => value.toString().trim().toLowerCase();

  const toIsoRangeStart = (dateString) => {
    const date = new Date(`${dateString}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  };

  const toIsoRangeEnd = (dateString) => {
    const date = new Date(`${dateString}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  };

  const handleSearch = async () => {
    if (!dateFrom || !dateTo) {
      setFilterError("Debes seleccionar el rango de fechas (Desde y Hasta) antes de buscar.");
      return;
    }

    if (new Date(`${dateFrom}T00:00:00`).getTime() > new Date(`${dateTo}T23:59:59.999`).getTime()) {
      setFilterError("La fecha Desde no puede ser mayor que la fecha Hasta.");
      return;
    }

    setFilterError("");
    setLoading(true);
    setHasSearched(true);

    try {
      const rangeStart = toIsoRangeStart(dateFrom);
      const rangeEnd = toIsoRangeEnd(dateTo);
      const rangeStartTs = new Date(`${dateFrom}T00:00:00`).getTime();
      const rangeEndTs = new Date(`${dateTo}T23:59:59.999`).getTime();
      const histRef = ref(db, "historialProcesamiento");
      const histQuery = query(
        histRef,
        orderByChild("fechaProcesamiento"),
        startAt(rangeStart),
        endAt(rangeEnd)
      );

      const snap = await get(histQuery);
      const data = snap.val() || {};
      let loaded = Object.entries(data).map(([id, value]) => ({ id, ...value }));

      if (loaded.length === 0) {
        const fullSnap = await get(histRef);
        const fullData = fullSnap.val() || {};
        loaded = Object.entries(fullData)
          .map(([id, value]) => ({ id, ...value }))
          .filter((item) => {
            const ts = getRepTimestamp(item);
            return ts >= rangeStartTs && ts <= rangeEndTs;
          });
      }

      setAppliedFilters({ search, categoryFilter, dateFrom, dateTo });
      setHistorial(loaded);
      setPage(0);
    } catch (error) {
      try {
        const rangeStartTs = new Date(`${dateFrom}T00:00:00`).getTime();
        const rangeEndTs = new Date(`${dateTo}T23:59:59.999`).getTime();
        const histRef = ref(db, "historialProcesamiento");
        const fullSnap = await get(histRef);
        const fullData = fullSnap.val() || {};
        const loaded = Object.entries(fullData)
          .map(([id, value]) => ({ id, ...value }))
          .filter((item) => {
            const ts = getRepTimestamp(item);
            return ts >= rangeStartTs && ts <= rangeEndTs;
          });

        setAppliedFilters({ search, categoryFilter, dateFrom, dateTo });
        setHistorial(loaded);
        setPage(0);
      } catch (fallbackError) {
        setHistorial([]);
        setFilterError("No se pudieron cargar los datos. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!hasSearched || filteredHistorial.length === 0) return;
    try {
      const rows = filteredHistorial.map((rep) => ({
        nombre: rep.nombre || "",
        categoria: categorias.find(c => c.id === rep.categoria)?.nombre || "",
        totalReparado: Number(rep.totalReparado) || 0,
        totalDesecho: Number(rep.totalDesecho) || 0,
        totalDevuelto: Number(rep.totalDevuelto) || 0,
        fechaProcesamiento: rep.fechaProcesamiento ? new Date(rep.fechaProcesamiento).toLocaleString() : ""
      }));

      const activosReparadosRows = filteredHistorial.flatMap((rep) => {
        const detalle = Array.isArray(rep.entregasProcesadas) ? rep.entregasProcesadas : [];
        const categoriaNombre = categorias.find(c => c.id === rep.categoria)?.nombre || "";
        return detalle
          .filter((item) => String(item?.tipo || '').trim().toLowerCase() === 'reparado')
          .map((item) => ({
            nombre: rep?.nombre || '',
            categoria: categoriaNombre,
            numActivo: item?.numActivo || '',
            tipo: item?.tipo || '',
            procesadoEn: item?.procesadoEn ? new Date(item.procesadoEn).toLocaleString() : ''
          }));
      });

      await exportStyledXlsx({
        fileName: `historial_reparaciones_${appliedFilters.dateFrom || 'sin_desde'}_${appliedFilters.dateTo || 'sin_hasta'}.xlsx`,
        sheets: [
          {
            sheetName: "Historial Reparaciones",
            columns: [
              { header: "Nombre", key: "nombre", width: 30 },
              { header: "Categoría", key: "categoria", width: 24 },
              { header: "Total Reparado", key: "totalReparado", width: 16 },
              { header: "Total Desecho", key: "totalDesecho", width: 16 },
              { header: "Total Devuelto", key: "totalDevuelto", width: 16 },
              { header: "Fecha Procesamiento", key: "fechaProcesamiento", width: 24 }
            ],
            rows
          },
          {
            sheetName: "Activos Reparados",
            columns: [
              { header: "Nombre", key: "nombre", width: 30 },
              { header: "Categoría", key: "categoria", width: 24 },
              { header: "Num. Activo", key: "numActivo", width: 20 },
              { header: "Tipo", key: "tipo", width: 16 },
              { header: "Procesado En", key: "procesadoEn", width: 26 }
            ],
            rows: activosReparadosRows
          }
        ]
      });
    } catch (error) {
      setFilterError("No se pudo generar el reporte en Excel.");
    }
  };

  const filteredHistorial = historial
    .filter(rep => {
      const nombreCat = categorias.find(c => c.id === rep.categoria)?.nombre || "";
      const text = normalizeText(appliedFilters.search);
      const repNombre = normalizeText(rep?.nombre || "");
      const repCategoria = normalizeText(nombreCat);
      const matchesSearch = !text || repNombre.includes(text) || repCategoria.includes(text);
      const matchesCategory = !appliedFilters.categoryFilter || rep.categoria === appliedFilters.categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => getRepTimestamp(b) - getRepTimestamp(a));

  const pagedHistorial = filteredHistorial.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Historial de Recepciones</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            label="Buscar"
            variant="outlined"
            size="large"
            fullWidth
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
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
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            label="Desde"
            type="date"
            fullWidth
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            label="Hasta"
            type="date"
            fullWidth
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleExportExcel}
            disabled={loading || !hasSearched || filteredHistorial.length === 0}
            startIcon={<Description />}
            sx={{
              height: '56px',
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#00830e',
              color: '#00830e',
              '&:hover': {
                borderColor: '#006b0b',
                color: '#006b0b'
              }
            }}
          >
            Reporte Excel
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSearch}
            disabled={loading}
            sx={{
              height: '56px',
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #00830e 0%, #006400 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #006b0b 0%, #005400 100%)'
              }
            }}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </Grid>
      </Grid>

      {filterError && (
        <Typography color="error" sx={{ mb: 2 }}>
          {filterError}
        </Typography>
      )}

      {!hasSearched && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Selecciona un rango de fechas y pulsa Buscar para cargar resultados.
        </Typography>
      )}

      <TableContainer component={Paper} sx={theme => ({ borderRadius: 3, boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)' })}>
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
            {!hasSearched ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="caption">No hay datos cargados todavía.</Typography>
                </TableCell>
              </TableRow>
            ) : pagedHistorial.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="caption">No se encontraron resultados con los filtros aplicados.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              pagedHistorial.map((rep, idx) => (
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={hasSearched ? filteredHistorial.length : 0}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10]}
      />

      {/* Dialog de detalle */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetail} 
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
          Detalle de Recepción - {selectedDetail?.nombre}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCloseDetail} 
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
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default HistorialRep;
