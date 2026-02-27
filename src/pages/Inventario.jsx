import React, { useEffect, useState, useRef } from "react";
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel, FormControl
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { readExcelFile } from "../utils/excelImport";

// Importar nodos de reparación
const repRefDb = ref(db, "reparaciones");

function Inventario() {
  const [articulos, setArticulos] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nombre: "", categoria: "", cantidad: "", revision: 0 });
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef();

  // Cargar inventario y categorías
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
    // Cargar reparaciones para calculo de revision
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

  // Abrir modal para agregar o editar
  const handleOpen = (articulo = null) => {
    if (articulo) {
      setEditId(articulo.id);
      setForm({
        nombre: articulo.nombre,
        categoria: articulo.categoria,
        cantidad: articulo.cantidad,
        revision: articulo.revision || 0
      });
    } else {
      setEditId(null);
      setForm({ nombre: "", categoria: "", cantidad: "", revision: 0 });
    }
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setForm({ nombre: "", categoria: "", cantidad: "" });
    setEditId(null);
  };

  // Guardar artículo (nuevo o editado)
  const handleSave = () => {
    if (!form.nombre || !form.categoria || !form.cantidad) return;
    const data = { ...form, revision: Number(form.revision) || 0 };
    if (editId) {
      update(ref(db, `inventario/${editId}`), data);
    } else {
      push(ref(db, "inventario"), data);
    }
    handleClose();
  };

  // Eliminar artículo
  const handleDelete = (id) => {
    remove(ref(db, `inventario/${id}`));
  };

  // Importar desde Excel
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportMsg("");
    try {
      // Columnas requeridas: Nombre, Categoría, Cantidad, Revisión (opcional)
      const rows = await readExcelFile(file, ["Nombre", "Categoría", "Cantidad", "Revisión"]);
      // Mapear categorías por nombre a id
      const catMap = Object.fromEntries(categorias.map(c => [c.nombre.trim().toLowerCase(), c.id]));
      // Mapear artículos existentes por nombre (case-insensitive, trim)
      const articulosMap = {};
      articulos.forEach(a => { articulosMap[a.nombre.trim().toLowerCase()] = a; });
      let countNuevos = 0, countActualizados = 0;
      for (let row of rows) {
        const nombre = row["Nombre"]?.toString().trim();
        const categoriaNombre = row["Categoría"]?.toString().trim().toLowerCase();
        const cantidad = row["Cantidad"];
        const revision = row["Revisión"] !== undefined && row["Revisión"] !== "" ? Number(row["Revisión"]) : 0;
        if (!nombre || !categoriaNombre || cantidad === undefined) continue;
        const categoria = catMap[categoriaNombre] || "";
        const key = nombre.toLowerCase();
        if (articulosMap[key]) {
          // Si la cantidad o revisión o categoría es diferente, actualizar
          if (
            articulosMap[key].cantidad !== cantidad ||
            articulosMap[key].categoria !== categoria ||
            (Number(articulosMap[key].revision) || 0) !== revision
          ) {
            await update(ref(db, `inventario/${articulosMap[key].id}`), { nombre, categoria, cantidad, revision });
            countActualizados++;
          }
        } else {
          await push(ref(db, "inventario"), { nombre, categoria, cantidad, revision });
          countNuevos++;
        }
      }
      let msg = `Se importaron ${countNuevos} artículos nuevos.`;
      if (countActualizados > 0) msg += ` ${countActualizados} artículos actualizados.`;
      setImportMsg(msg);
    } catch (err) {
      setImportMsg("Error: " + err);
    }
    fileInputRef.current.value = "";
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Inventario de Mobiliario</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          sx={{ 
            background: 'linear-gradient(135deg, #00830e 0%, #00a819 100%)',
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(0, 131, 14, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #006b0b 0%, #008c15 100%)',
              transform: 'translateY(-1px)'
            }
          }} 
          onClick={() => handleOpen()}
        >
          Agregar Artículo
        </Button>
        <Button 
          variant="outlined" 
          component="label" 
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Importar Excel
          <input type="file" accept=".xlsx" hidden ref={fileInputRef} onChange={handleImportExcel} />
        </Button>
      </Box>
      {importMsg && <Typography color={importMsg.startsWith("Error") ? "error" : "success.main"} sx={{ mb: 2 }}>{importMsg}</Typography>}
      <TableContainer component={Paper} sx={theme => ({ borderRadius: 3, boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)' })}>
        <Table>
          <TableHead>
            <TableRow sx={theme => ({ bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,131,14,0.2)' : 'rgba(0,131,14,0.08)' })}>
              <TableCell sx={{ fontWeight: 600 }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Cantidad</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Revisión</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {articulos.map((art) => {
               // Calcular revision desde reparaciones
               const revCount = reparaciones.filter(r => r.id === art.id)
                 .reduce((sum, r) => sum + (Number(r.revision) || 0), 0);
               return (
                <TableRow key={art.id}>
                  <TableCell>{art.nombre}</TableCell>
                  <TableCell>{categorias.find(c => c.id === art.categoria)?.nombre || ""}</TableCell>
                  <TableCell>{art.cantidad}</TableCell>
                  <TableCell>{revCount}</TableCell>
                  <TableCell>{art.cantidad - revCount}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => handleOpen(art)}><Edit /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(art.id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
               );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal para agregar/editar */}
      <Dialog 
        open={open} 
        onClose={handleClose}
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
          {editId ? "Editar Artículo" : "Agregar Artículo"}
        </DialogTitle>
        <DialogContent sx={{ minWidth: 320, pt: 3 }}>
          <TextField
            label="Nombre del Artículo"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Categoría</InputLabel>
            <Select
              value={form.categoria}
              label="Categoría"
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            >
              {categorias.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Cantidad"
            type="number"
            value={form.cantidad}
            onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
            fullWidth
            margin="normal"
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Revisión"
            type="number"
            value={form.revision}
            onChange={e => setForm(f => ({ ...f, revision: e.target.value }))}
            fullWidth
            margin="normal"
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
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
            {editId ? "Guardar" : "Agregar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Inventario;
