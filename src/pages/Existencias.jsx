import React, { useEffect, useState } from "react";
import {
  Box, Typography, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button
} from "@mui/material";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
// Referencia a reparaciones (para calcular revisión acumulada)
const repRefDb = ref(db, "reparaciones");
import * as XLSX from "xlsx";

function Existencias() {
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
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

  // Exportar a Excel
  const handleExportExcel = () => {
    const data = articulosFiltrados.map(art => ({
      Nombre: art.nombre,
      Categoria: categorias.find(c => c.id === art.categoria)?.nombre || "",
      Cantidad: art.cantidad
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Existencias");
    XLSX.writeFile(wb, "existencias.xlsx");
  };

  // Filtrado por coincidencia de palabras
  const articulosFiltrados = articulos.filter(art => {
    const palabras = busqueda.trim().toLowerCase().split(/\s+/);
    const nombre = (art.nombre || "").toLowerCase();
    const categoria = (categorias.find(c => c.id === art.categoria)?.nombre || "").toLowerCase();
    return palabras.every(palabra => nombre.includes(palabra) || categoria.includes(palabra));
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Existencias de Inventario</Typography>
      <TextField
        label="Buscar por nombre o categoría"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button variant="outlined" sx={{ mb: 2 }} onClick={handleExportExcel}>
        Exportar a Excel
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Total</TableCell>
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
