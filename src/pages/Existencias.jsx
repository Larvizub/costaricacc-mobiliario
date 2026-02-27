import React, { useEffect, useState } from "react";
import {
  Box, Typography, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Link
} from "@mui/material";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { exportStyledXlsx } from "../utils/excelExport";

function Existencias() {
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    // Referencia a reparaciones (para calcular revisión acumulada)
    const repRefDb = ref(db, "reparaciones");
    const invRef = ref(db, "inventario");
    const catRef = ref(db, "categorias");
    const unsubInv = onValue(invRef, snap => {
      const data = snap.val() || {};
      setArticulos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });
    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    const unsubRep = onValue(repRefDb, snap => {
      const data = snap.val() || {};
      setReparaciones(Object.entries(data).map(([fid, v]) => ({ firebaseId: fid, ...v })));
    });
    return () => {
      unsubInv();
      unsubCat();
      unsubRep();
    };
  }, []);

  const handleExportExcel = async () => {
    try {
      const rows = articulosFiltrados.map(art => ({
        nombre: art.nombre,
        categoria: categorias.find(c => c.id === art.categoria)?.nombre || "",
        cantidad: art.cantidad,
        imagenReferencia: art.imagenUrl || ""
      }));
      await exportStyledXlsx({
        fileName: "existencias.xlsx",
        sheetName: "Existencias",
        columns: [
          { header: "Nombre", key: "nombre", width: 36 },
          { header: "Categoría", key: "categoria", width: 28 },
          { header: "Cantidad", key: "cantidad", width: 14 },
          { header: "Imagen (Link)", key: "imagenReferencia", width: 60 }
        ],
        rows
      });
    } catch (e) {
      console.error('Error exporting excel report', e);
      alert('No fue posible exportar a Excel. Intenta recargar la página.');
    }
  };

  // Filtrado por coincidencia de palabras
  const articulosFiltrados = articulos.filter(art => {
    const palabras = busqueda.trim().toLowerCase().split(/\s+/);
    const nombre = (art.nombre || "").toLowerCase();
    const categoria = (categorias.find(c => c.id === art.categoria)?.nombre || "").toLowerCase();
    return palabras.every(palabra => nombre.includes(palabra) || categoria.includes(palabra));
  });

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Existencias de Inventario</Typography>
      <TextField
        label="Buscar por nombre o categoría"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        fullWidth
        margin="normal"
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '&:hover fieldset': { borderColor: '#00830e' },
            '&.Mui-focused fieldset': { borderColor: '#00830e' }
          }
        }}
      />
      <Button 
        variant="outlined" 
        sx={{ 
          mb: 3,
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 600
        }} 
        onClick={handleExportExcel}
      >
        Exportar a Excel
      </Button>
      <TableContainer component={Paper} sx={theme => ({ borderRadius: 3, boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)' })}>
        <Table>
          <TableHead>
            <TableRow sx={theme => ({ bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,131,14,0.2)' : 'rgba(0,131,14,0.08)' })}>
              <TableCell sx={{ fontWeight: 600 }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Imagen de referencia</TableCell>
            </TableRow>
          </TableHead>
            <TableBody>
              {articulosFiltrados.map(art => {
                const revCount = reparaciones
                  .filter(r => r.id === art.id)
                  .reduce((sum, r) => sum + (Number(r.revision) || 0), 0);
                return (
                  <TableRow key={art.id}>
                    <TableCell>{art.nombre}</TableCell>
                    <TableCell>{categorias.find(c => c.id === art.categoria)?.nombre || ""}</TableCell>
                    <TableCell>{Number(art.cantidad) - revCount}</TableCell>
                    <TableCell>
                      {art.imagenUrl ? (
                        <Link href={art.imagenUrl} target="_blank" rel="noreferrer">
                          Ver imagen
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default Existencias;
