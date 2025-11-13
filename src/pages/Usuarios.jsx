
import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, CircularProgress, Alert, TextField, Button, useTheme, Select, MenuItem
} from "@mui/material";
import { Delete, Edit, Save, Cancel } from "@mui/icons-material";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";
import { useAuth } from "../contexts/AuthContext";

function Usuarios() {
  const { user, userData } = useAuth();
  const theme = useTheme();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: "", email: "", rol: "cliente" });

  useEffect(() => {
    const usuariosRef = ref(db, "usuarios");
    const unsub = onValue(usuariosRef, snap => {
      const data = snap.val() || {};
      setUsuarios(Object.entries(data).map(([uid, value]) => ({ uid, ...value })));
      setLoading(false);
    }, err => {
      setError("Error al cargar usuarios");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Lógica de admin: admin@costaricacc.com o rol administrador
  const isAdmin = (user && user.email === "admin@costaricacc.com") || userData?.rol === "administrador";

  const handleDelete = async (uid) => {
    setError("");
    setSuccess("");
    try {
      await remove(ref(db, `usuarios/${uid}`));
      setSuccess("Usuario eliminado.");
    } catch (err) {
      setError("No se pudo eliminar el usuario.");
    }
  };

  // Búsqueda y edición
  const usuariosFiltrados = usuarios.filter(u =>
    u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.uid?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleEdit = (idx) => {
    setEditIdx(idx);
    setEditForm({
      nombre: usuariosFiltrados[idx].nombre || "",
      email: usuariosFiltrados[idx].email || "",
      rol: usuariosFiltrados[idx].rol || "cliente"
    });
  };
  const handleEditChange = e => {
    setEditForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };
  const handleEditSave = async (uid) => {
    setError("");
    setSuccess("");
    try {
      // Actualiza nombre, email y rol en la base de datos
      await import("firebase/database").then(({ ref, update }) =>
        update(ref(db, `usuarios/${uid}`), { nombre: editForm.nombre, email: editForm.email, rol: editForm.rol })
      );
      setSuccess("Usuario actualizado.");
      setEditIdx(null);
    } catch (err) {
      setError("No se pudo actualizar el usuario.");
    }
  };
  const handleEditCancel = () => {
    setEditIdx(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Usuarios</Typography>
      <Paper
        sx={{
          p: 3,
          width: '100%',
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fff',
          color: theme.palette.text.primary,
          boxShadow: theme.palette.mode === 'dark' ? 2 : 3
        }}
      >
        <TextField
          label="Buscar usuario"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            style: {
              background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
              color: theme.palette.text.primary
            }
          }}
        />
        {loading ? <CircularProgress /> : (
          <TableContainer
            sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff',
              color: theme.palette.text.primary
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100' }}>
                  <TableCell sx={{ color: theme.palette.text.primary }}>Nombre</TableCell>
                  <TableCell sx={{ color: theme.palette.text.primary }}>Correo</TableCell>
                  <TableCell sx={{ color: theme.palette.text.primary }}>Rol</TableCell>
                  {isAdmin && <TableCell align="right" sx={{ color: theme.palette.text.primary }}>Acciones</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {usuariosFiltrados.map((u, idx) => {
                  // No permitir editar/eliminarse a sí mismo si es admin
                  const isSelf = user && u.uid === user.uid;
                  return (
                    <TableRow key={u.uid} sx={{ bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fff' }}>
                      <TableCell sx={{ color: theme.palette.text.primary }}>
                        {editIdx === idx ? (
                          <TextField name="nombre" value={editForm.nombre} onChange={handleEditChange} size="small"
                            InputProps={{
                              style: {
                                background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
                                color: theme.palette.text.primary
                              }
                            }}
                            disabled={isSelf}
                          />
                        ) : (
                          u.nombre || ""
                        )}
                      </TableCell>
                      <TableCell sx={{ color: theme.palette.text.primary }}>
                        {editIdx === idx ? (
                          <TextField name="email" value={editForm.email} onChange={handleEditChange} size="small"
                            InputProps={{
                              style: {
                                background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
                                color: theme.palette.text.primary
                              }
                            }}
                            disabled={isSelf}
                          />
                        ) : (
                          u.email || ""
                        )}
                      </TableCell>
                      <TableCell sx={{ color: theme.palette.text.primary }}>
                        {editIdx === idx ? (
                          <Select
                            name="rol"
                            value={editForm.rol}
                            onChange={handleEditChange}
                            size="small"
                            sx={{ minWidth: 120 }}
                            disabled={isSelf}
                          >
                            <MenuItem value="cliente">Cliente</MenuItem>
                            <MenuItem value="areas">Areas</MenuItem>
                            <MenuItem value="infraestructura">Infraestructura</MenuItem>
                            <MenuItem value="administrador">Administrador</MenuItem>
                          </Select>
                        ) : (
                          u.rol === "administrador"
                            ? "Administrador"
                            : u.rol === "infraestructura"
                              ? "Infraestructura"
                              : u.rol === "areas"
                                ? "Areas"
                                : "Cliente"
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right" sx={{ color: theme.palette.text.primary }}>
                          {isSelf ? null : (
                            editIdx === idx ? (
                              <>
                                <IconButton color="success" onClick={() => handleEditSave(u.uid)}><Save /></IconButton>
                                <IconButton color="inherit" onClick={handleEditCancel}><Cancel /></IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton color="primary" onClick={() => handleEdit(idx)}><Edit /></IconButton>
                                <IconButton color="error" onClick={() => handleDelete(u.uid)}><Delete /></IconButton>
                              </>
                            )
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </Paper>
    </Box>
  );
}

export default Usuarios;
