import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, TextField, Button, List, ListItem, ListItemText, IconButton, Divider, Grid
} from "@mui/material";
import { Add, Delete, Edit, Save, Cancel } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, push, onValue, remove, update } from "firebase/database";

function Categorias() {
  // Estados para categorías
  const [categoria, setCategoria] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [editCatId, setEditCatId] = useState(null);
  const [editCatValue, setEditCatValue] = useState("");

  // Estados para solicitantes
  const [solicitante, setSolicitante] = useState("");
  const [solicitantes, setSolicitantes] = useState([]);
  const [editSolId, setEditSolId] = useState(null);
  const [editSolValue, setEditSolValue] = useState("");

  // Cargar categorías y solicitantes desde Firebase
  useEffect(() => {
    const catRef = ref(db, "categorias");
    const solRef = ref(db, "solicitantes");
    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    const unsubSol = onValue(solRef, snap => {
      const data = snap.val() || {};
      setSolicitantes(Object.entries(data).map(([id, value]) => ({ id, nombre: value.nombre })));
    });
    return () => {
      unsubCat();
      unsubSol();
    };
  }, []);

  // Agregar categoría
  const handleAddCategoria = () => {
    if (categoria.trim()) {
      push(ref(db, "categorias"), { nombre: categoria.trim() });
      setCategoria("");
    }
  };

  // Editar categoría
  const handleEditCategoria = (id, nombre) => {
    setEditCatId(id);
    setEditCatValue(nombre);
  };
  const handleSaveEditCategoria = (id) => {
    update(ref(db, `categorias/${id}`), { nombre: editCatValue });
    setEditCatId(null);
    setEditCatValue("");
  };

  // Eliminar categoría
  const handleDeleteCategoria = (id) => {
    remove(ref(db, `categorias/${id}`));
  };

  // Agregar solicitante
  const handleAddSolicitante = () => {
    if (solicitante.trim()) {
      push(ref(db, "solicitantes"), { nombre: solicitante.trim() });
      setSolicitante("");
    }
  };

  // Editar solicitante
  const handleEditSolicitante = (id, nombre) => {
    setEditSolId(id);
    setEditSolValue(nombre);
  };
  const handleSaveEditSolicitante = (id) => {
    update(ref(db, `solicitantes/${id}`), { nombre: editSolValue });
    setEditSolId(null);
    setEditSolValue("");
  };

  // Eliminar solicitante
  const handleDeleteSolicitante = (id) => {
    remove(ref(db, `solicitantes/${id}`));
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Categorías y Solicitantes</Typography>
      <Grid container spacing={4}>
        {/* Categorías */}
        <Grid item xs={12} md={6}>
          <Paper sx={theme => ({ 
            p: 3, 
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
          })}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Categorías</Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField
                label="Nueva categoría"
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                size="small"
                fullWidth
              />
              <Button variant="contained" color="primary" onClick={handleAddCategoria} startIcon={<Add />}>
                Agregar
              </Button>
            </Box>
            <List>
              {categorias.map(cat => (
                <ListItem
                  key={cat.id}
                  secondaryAction={
                    editCatId === cat.id ? (
                      <>
                        <IconButton edge="end" onClick={() => handleSaveEditCategoria(cat.id)}><Save /></IconButton>
                        <IconButton edge="end" onClick={() => setEditCatId(null)}><Cancel /></IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton edge="end" onClick={() => handleEditCategoria(cat.id, cat.nombre)}><Edit /></IconButton>
                        <IconButton edge="end" onClick={() => handleDeleteCategoria(cat.id)}><Delete /></IconButton>
                      </>
                    )
                  }
                >
                  {editCatId === cat.id ? (
                    <TextField
                      value={editCatValue}
                      onChange={e => setEditCatValue(e.target.value)}
                      size="small"
                      fullWidth
                    />
                  ) : (
                    <ListItemText primary={cat.nombre} />
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        {/* Solicitantes */}
        <Grid item xs={12} md={6}>
          <Paper sx={theme => ({ 
            p: 3, 
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
          })}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Pool de Solicitantes</Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField
                label="Nuevo solicitante"
                value={solicitante}
                onChange={e => setSolicitante(e.target.value)}
                size="small"
                fullWidth
              />
              <Button variant="contained" color="primary" onClick={handleAddSolicitante} startIcon={<Add />}>
                Agregar
              </Button>
            </Box>
            <List>
              {solicitantes.map(sol => (
                <ListItem
                  key={sol.id}
                  secondaryAction={
                    editSolId === sol.id ? (
                      <>
                        <IconButton edge="end" onClick={() => handleSaveEditSolicitante(sol.id)}><Save /></IconButton>
                        <IconButton edge="end" onClick={() => setEditSolId(null)}><Cancel /></IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton edge="end" onClick={() => handleEditSolicitante(sol.id, sol.nombre)}><Edit /></IconButton>
                        <IconButton edge="end" onClick={() => handleDeleteSolicitante(sol.id)}><Delete /></IconButton>
                      </>
                    )
                  }
                >
                  {editSolId === sol.id ? (
                    <TextField
                      value={editSolValue}
                      onChange={e => setEditSolValue(e.target.value)}
                      size="small"
                      fullWidth
                    />
                  ) : (
                    <ListItemText primary={sol.nombre} />
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Categorias;
