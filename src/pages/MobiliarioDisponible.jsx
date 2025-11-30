import React from "react";
import { Box, Typography } from "@mui/material";

function MobiliarioDisponible() {
  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Mobiliario Disponible</Typography>
      {/* Aquí irá la tabla de búsqueda, edición y eliminación */}
    </Box>
  );
}

export default MobiliarioDisponible;
