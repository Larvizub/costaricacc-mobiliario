import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { db } from "../firebase";
import { get, onValue, ref } from "firebase/database";

const estadosNoBloqueantes = new Set([
  "rechazada",
  "rechazado",
  "cancelada",
  "cancelado",
  "eliminada",
  "eliminado",
  "completada",
  "completado"
]);

const parseDateTime = (fecha, hora, isEnd = false) => {
  if (!fecha) return null;
  const timePart = hora || (isEnd ? "23:59" : "00:00");
  const value = new Date(`${fecha}T${timePart}`);
  return Number.isNaN(value.getTime()) ? null : value;
};

function Disponibilidad() {
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busquedaArticulo, setBusquedaArticulo] = useState("");
  const [articuloId, setArticuloId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFinal, setFechaFinal] = useState("");
  const [resultado, setResultado] = useState(null);
  const [registrosReserva, setRegistrosReserva] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const invRef = ref(db, "inventario");
    const catRef = ref(db, "categorias");

    const unsubInv = onValue(invRef, snap => {
      const data = snap.val() || {};
      setArticulos(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });

    const unsubCat = onValue(catRef, snap => {
      const data = snap.val() || {};
      setCategorias(Object.entries(data).map(([id, value]) => ({ id, ...value })));
    });

    return () => {
      unsubInv();
      unsubCat();
    };
  }, []);

  const articuloSeleccionado = useMemo(
    () => articulos.find(a => a.id === articuloId),
    [articulos, articuloId]
  );

  const getCategoriaNombre = categoriaId => {
    return categorias.find(c => c.id === categoriaId)?.nombre || "Sin categoría";
  };

  const articulosFiltrados = useMemo(() => {
    const filtro = busquedaArticulo.trim().toLowerCase();
    if (!filtro) return articulos;

    return articulos.filter(articulo => {
      const nombre = (articulo.nombre || "").toLowerCase();
      const categoria = getCategoriaNombre(articulo.categoria).toLowerCase();
      return nombre.includes(filtro) || categoria.includes(filtro);
    });
  }, [articulos, busquedaArticulo, categorias]);

  const handleBuscar = async () => {
    setError("");
    setResultado(null);
    setRegistrosReserva([]);

    if (!articuloId || !fechaInicio || !fechaFinal) {
      setError("Selecciona artículo, fecha de inicio y fecha final.");
      return;
    }

    const inicio = parseDateTime(fechaInicio, "00:00", false);
    const fin = parseDateTime(fechaFinal, "23:59", true);

    if (!inicio || !fin || fin < inicio) {
      setError("El rango de fechas no es válido.");
      return;
    }

    setLoading(true);
    try {
      const snap = await get(ref(db, "solicitudes"));
      const solicitudes = snap.exists() ? Object.values(snap.val()) : [];

      const coincidencias = [];

      solicitudes.forEach(sol => {
        const estado = (sol?.estado || "pendiente").toString().trim().toLowerCase();
        if (estadosNoBloqueantes.has(estado)) return;

        const inicioSol = parseDateTime(sol.fechaInicio, sol.horaInicio, false);
        const finSol = parseDateTime(sol.fechaFin, sol.horaFin, true);
        if (!inicioSol || !finSol) return;

        const hayTraslape = fin >= inicioSol && inicio <= finSol;
        if (!hayTraslape) return;

        let cantidadReservada = 0;
        let observacionesItem = "";

        (sol.detalle || []).forEach(item => {
          if (item.articulo === articuloId && !item.liberado) {
            cantidadReservada += Number(item.cantidad) || 0;
            if (!observacionesItem && item.observaciones) {
              observacionesItem = item.observaciones;
            }
          }
        });

        if (cantidadReservada > 0) {
          coincidencias.push({
            evento: sol.evento || "Sin evento",
            fechaInicio: sol.fechaInicio || "-",
            fechaFin: sol.fechaFin || "-",
            cantidad: cantidadReservada,
            observaciones: observacionesItem || sol.observaciones || "-"
          });
        }
      });

      if (coincidencias.length > 0) {
        setResultado({ reservado: true });
        setRegistrosReserva(coincidencias);
      } else {
        setResultado({ reservado: false });
      }
    } catch (e) {
      console.error("Error consultando disponibilidad:", e);
      setError("No fue posible consultar la disponibilidad. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Disponibilidad
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.3fr 1.3fr 1fr 1fr auto" }, gap: 2 }}>
          <TextField
            label="Buscar artículo"
            value={busquedaArticulo}
            onChange={e => setBusquedaArticulo(e.target.value)}
            placeholder="Nombre o categoría"
            fullWidth
          />

          <TextField
            select
            label="Artículo"
            value={articuloId}
            onChange={e => setArticuloId(e.target.value)}
            fullWidth
          >
            {articulosFiltrados.map(articulo => (
              <MenuItem key={articulo.id} value={articulo.id}>
                {`${articulo.nombre || "Sin nombre"} (${getCategoriaNombre(articulo.categoria)})`}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Fecha inicio"
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="Fecha final"
            type="date"
            value={fechaFinal}
            onChange={e => setFechaFinal(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <Button
            variant="contained"
            onClick={handleBuscar}
            disabled={loading}
            sx={{ minHeight: 56 }}
          >
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {resultado && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            Resultado de disponibilidad
          </Typography>
          <Alert severity={resultado.reservado ? "warning" : "success"} sx={{ mb: resultado.reservado ? 2 : 0 }}>
            {resultado.reservado
              ? `El artículo ${articuloSeleccionado?.nombre || "seleccionado"} está reservado en el rango indicado.`
              : `El artículo ${articuloSeleccionado?.nombre || "seleccionado"} está disponible en el rango indicado.`}
          </Alert>

          {resultado.reservado && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Evento</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Fechas de reserva</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Cantidad</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Observaciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrosReserva.map((reserva, idx) => (
                    <TableRow key={`${reserva.evento}-${reserva.fechaInicio}-${idx}`}>
                      <TableCell>{reserva.evento}</TableCell>
                      <TableCell>{`${reserva.fechaInicio} - ${reserva.fechaFin}`}</TableCell>
                      <TableCell>{reserva.cantidad}</TableCell>
                      <TableCell>{reserva.observaciones}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default Disponibilidad;
