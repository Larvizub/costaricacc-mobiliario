import React, { useState } from "react";
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, AppBar, Toolbar, Typography, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Dashboard, Event, Inventory, Category, People, Settings, Logout, Brightness4, Brightness7, Mail, AccountCircle, ListAlt, AssignmentTurnedIn, ChecklistOutlined, Build, AssignmentReturn, History, BatteryChargingFull } from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const drawerWidth = 240;


const menuItemsAdmin = [
  { text: "Dashboard", icon: <Dashboard />, path: "/" },
  { text: "Solicitud", icon: <Event />, path: "/solicitud" },
  { text: "Autorización", icon: <AssignmentTurnedIn />, path: "/autorizacion" },
  { text: "Entregas", icon: <ChecklistOutlined />, path: "/entregas" },
  { text: "Tiempo de Carga", icon: <BatteryChargingFull />, path: "/tiempo-carga" },
  { text: "Inventario", icon: <Inventory />, path: "/inventario" },
  { text: "Existencias", icon: <ListAlt />, path: "/existencias" },
  { text: "Historial", icon: <Event />, path: "/historial" },
  { text: "Reparación", icon: <Build />, path: "/reparacion" },
  { text: "Entrega Activos", icon: <AssignmentReturn />, path: "/entrega-activos" },
  { text: "Historial Rep.", icon: <History />, path: "/historial-rep" },
  { text: "Categorías", icon: <Category />, path: "/categorias" },
  { text: "Eventos", icon: <Event />, path: "/eventos" },
  { text: "Usuarios", icon: <People />, path: "/usuarios" },
  { text: "Notificaciones", icon: <Mail />, path: "/notificaciones" },
  { text: "Preferencias", icon: <Settings />, path: "/preferencias" }
];
const menuItemsCliente = [
  { text: "Dashboard", icon: <Dashboard />, path: "/" },
  { text: "Solicitud", icon: <Event />, path: "/solicitud" },
  { text: "Existencias", icon: <ListAlt />, path: "/existencias" },
  { text: "Historial", icon: <Event />, path: "/historial" },
  { text: "Preferencias", icon: <Settings />, path: "/preferencias" }
];

const menuItemsInfra = [
  { text: "Dashboard", icon: <Dashboard />, path: "/" },
  { text: "Solicitud", icon: <Event />, path: "/solicitud" },
  { text: "Autorización", icon: <AssignmentTurnedIn />, path: "/autorizacion" },
  { text: "Entregas", icon: <ChecklistOutlined />, path: "/entregas" },
  { text: "Tiempo de Carga", icon: <BatteryChargingFull />, path: "/tiempo-carga" },
  { text: "Inventario", icon: <Inventory />, path: "/inventario" },
  { text: "Existencias", icon: <ListAlt />, path: "/existencias" },
  { text: "Historial", icon: <Event />, path: "/historial" },
  { text: "Reparación", icon: <ChecklistOutlined />, path: "/reparacion" },
  { text: "Historial Rep.", icon: <ChecklistOutlined />, path: "/historial-rep" },
  { text: "Preferencias", icon: <Settings />, path: "/preferencias" },
];

const menuItemsAreas = [
  { text: "Dashboard", icon: <Dashboard />, path: "/" },
  { text: "Autorización", icon: <AssignmentTurnedIn />, path: "/autorizacion" },
  { text: "Historial", icon: <Event />, path: "/historial" },
  { text: "Inventario", icon: <Inventory />, path: "/inventario" },
  { text: "Existencias", icon: <ListAlt />, path: "/existencias" },
  { text: "Reparación", icon: <ChecklistOutlined />, path: "/reparacion" },
  { text: "Entrega Activos", icon: <AssignmentReturn />, path: "/entrega-activos" },
  { text: "Historial Rep.", icon: <ChecklistOutlined />, path: "/historial-rep" },
  { text: "Eventos", icon: <Event />, path: "/eventos" },
  { text: "Usuarios", icon: <People />, path: "/usuarios" },
  { text: "Preferencias", icon: <Settings />, path: "/preferencias" },
];

function MainLayout({ children, onToggleTheme }) {
  const theme = useTheme();
  const location = useLocation();
  const { user, userData, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Determinar menú según rol
  let menuItems = menuItemsCliente;
  if (userData?.rol === "administrador" || user?.email === "admin@costaricacc.com") {
    menuItems = menuItemsAdmin;
  } else if (userData?.rol === "infraestructura") {
    menuItems = menuItemsInfra;
  } else if (userData?.rol === "areas") {
    menuItems = menuItemsAreas;
  }
  const drawer = (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <Toolbar />
      {/* Logo superior eliminado */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <List sx={{ flex: 1 }}>
          {menuItems.map(item => (
            <ListItem
              button
              key={item.text}
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={isMobile ? handleDrawerToggle : undefined}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
        {/* Usuario activo al final */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: 2, borderTop: '1px solid #e0e0e0', bgcolor: theme.palette.mode === 'dark' ? '#222' : '#fafafa' }}>
          <img
            src="https://costaricacc.com/cccr/Logoheroica.png"
            alt="Logo Heroica"
            style={{ height: 32, marginBottom: 8, filter: theme.palette.mode === 'dark' ? 'invert(1) brightness(1.8) grayscale(1)' : 'none' }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle fontSize="small" color="action" />
            <Typography variant="body2" color="textSecondary" noWrap>
              {user?.email || 'No autenticado'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <img
            src="https://costaricacc.com/cccr/Logocccr.png"
            alt="Logo principal"
            style={{
              height: 40,
              marginRight: 16,
              filter: 'invert(1) brightness(1.8) grayscale(1)'
            }}
          />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Gestión de Mobiliario</Typography>
          <IconButton color="inherit" onClick={onToggleTheme} title="Cambiar modo claro/oscuro">
            {theme.palette.mode === "dark" ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton color="inherit" onClick={logout} title="Cerrar sesión">
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>
      {/* Drawer responsivo */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="menu lateral">
        {/* Drawer temporal para móvil */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            [`& .MuiDrawer-paper`]: { 
              width: drawerWidth, 
              boxSizing: "border-box",
              borderRight: theme.palette.mode === 'dark' ? '0.5px solid rgba(255, 255, 255, 0.08)' : '0.5px solid rgba(0, 0, 0, 0.08)'
            }
          }}
        >
          {drawer}
        </Drawer>
        {/* Drawer permanente para escritorio */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            [`& .MuiDrawer-paper`]: { 
              width: drawerWidth, 
              boxSizing: "border-box",
              borderRight: theme.palette.mode === 'dark' ? '0.5px solid rgba(255, 255, 255, 0.08)' : '0.5px solid rgba(0, 0, 0, 0.08)'
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 3 },
          width: "100%",
          maxWidth: "100vw",
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#f5f5f5',
          minHeight: '100vh',
          color: theme.palette.text.primary,
          borderLeft: 'none'
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default MainLayout;
