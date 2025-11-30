import React, { useEffect, useState, useRef } from "react";
import {
  Box, Typography, Paper, TextField, Button, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton
} from "@mui/material";
import { Edit, Delete, Save, Cancel } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, onValue, push, update, remove } from "firebase/database";
import { readExcelFile } from "../utils/excelImport";
import { useSnackbar } from "notistack";

function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [form, setForm] = useState({ id: "", nombre: "" });
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({ id: "", nombre: "" });
  const { enqueueSnackbar } = useSnackbar();
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef();

  useEffect(() => {
    const eventosRef = ref(db, "eventos");
    const unsub = onValue(eventosRef, snap => {
      const data = snap.val() || {};
      setEventos(Object.entries(data).map(([key, value]) => ({ key, ...value })));
    });
    return () => unsub();
  }, []);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };
  const handleEditChange = e => {
    setEditForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleAdd = async e => {
    e.preventDefault();
    if (!form.id || !form.nombre) return enqueueSnackbar("Completa todos los campos", { variant: "warning" });
    try {
      await push(ref(db, "eventos"), { id: form.id, nombre: form.nombre });
      setForm({ id: "", nombre: "" });
      enqueueSnackbar("Evento guardado", { variant: "success" });
    } catch {
      enqueueSnackbar("Error al guardar", { variant: "error" });
    }
  };

  const handleEdit = idx => {
    setEditIdx(idx);
    setEditForm({ id: eventos[idx].id, nombre: eventos[idx].nombre });
  };
  const handleEditSave = async key => {
    if (!editForm.id || !editForm.nombre) return enqueueSnackbar("Completa todos los campos", { variant: "warning" });
    try {
      await update(ref(db, `eventos/${key}`), { id: editForm.id, nombre: editForm.nombre });
      setEditIdx(null);
      enqueueSnackbar("Evento actualizado", { variant: "success" });
    } catch {
      enqueueSnackbar("Error al actualizar", { variant: "error" });
    }
  };
  const handleEditCancel = () => setEditIdx(null);
  const handleDelete = async key => {
    try {
      await remove(ref(db, `eventos/${key}`));
      enqueueSnackbar("Evento eliminado", { variant: "success" });
    } catch {
      enqueueSnackbar("Error al eliminar", { variant: "error" });
    }
  };

  // Importar desde Excel
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportMsg("");
    try {
      // Columnas requeridas: ID, Nombre
      const rows = await readExcelFile(file, ["ID", "Nombre"]);
      // Crear set de nombres existentes (case-insensitive, trim)
      const nombresExistentes = new Set(eventos.map(ev => ev.nombre.trim().toLowerCase()));
      let count = 0, duplicados = 0;
      for (let row of rows) {
        const id = row["ID"]?.toString().trim();
        const nombre = row["Nombre"]?.toString().trim();
        if (!id || !nombre) continue;
        if (nombresExistentes.has(nombre.toLowerCase())) {
          duplicados++;
          continue;
        }
        await push(ref(db, "eventos"), { id, nombre });
        nombresExistentes.add(nombre.toLowerCase());
        count++;
      }
      let msg = `Se importaron ${count} eventos correctamente.`;
      if (duplicados > 0) msg += ` ${duplicados} duplicados fueron omitidos.`;
      setImportMsg(msg);
    } catch (err) {
      setImportMsg("Error: " + err);
    }
    fileInputRef.current.value = "";
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 'none', px: { xs: 0, md: 0 }, pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Eventos</Typography>
      <Button 
        variant="outlined" 
        component="label" 
        sx={{ 
          mb: 3,
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 600
        }}
      >
        Importar Excel
        <input type="file" accept=".xlsx,.xls" hidden ref={fileInputRef} onChange={handleImportExcel} />
      </Button>
      {importMsg && <Typography color={importMsg.startsWith("Error") ? "error" : "success.main"} sx={{ mb: 2 }}>{importMsg}</Typography>}
      <Paper sx={theme => ({ 
        p: { xs: 2, md: 3 }, 
        width: '100%', 
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
      })} elevation={0}>
        <form onSubmit={handleAdd} style={{ marginBottom: 24 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={5}>
              <TextField label="ID de evento" name="id" value={form.id} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField label="Nombre del evento" name="nombre" value={form.nombre} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button type="submit" variant="contained" sx={{ bgcolor: "#00830e", height: '100%' }}>Agregar</Button>
            </Grid>
          </Grid>
        </form>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventos.map((ev, idx) => (
                <TableRow key={ev.key}>
                  <TableCell>
                    {editIdx === idx ? (
                      <TextField name="id" value={editForm.id} onChange={handleEditChange} size="small" />
                    ) : (
                      ev.id
                    )}
                  </TableCell>
                  <TableCell>
                    {editIdx === idx ? (
                      <TextField name="nombre" value={editForm.nombre} onChange={handleEditChange} size="small" />
                    ) : (
                      ev.nombre
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {editIdx === idx ? (
                      <>
                        <IconButton color="success" onClick={() => handleEditSave(ev.key)}><Save /></IconButton>
                        <IconButton color="inherit" onClick={handleEditCancel}><Cancel /></IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton color="primary" onClick={() => handleEdit(idx)}><Edit /></IconButton>
                        <IconButton color="error" onClick={() => handleDelete(ev.key)}><Delete /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default Eventos;
