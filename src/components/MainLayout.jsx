import React, { useState } from "react";
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, AppBar, Toolbar, Typography, useTheme, useMediaQuery, Avatar, Chip } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Dashboard, Event, Inventory, Category, People, Settings, Logout, Brightness4, Brightness7, Mail, AccountCircle, ListAlt, AssignmentTurnedIn, ChecklistOutlined, Build, AssignmentReturn, History, BatteryChargingFull } from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const drawerWidth = 260;


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

  // Determinar menú según rol (normalizado para evitar problemas de mayúsculas/acentos)
  const role = userData?.rol?.toString().trim().toLowerCase() || '';
  let menuItems = menuItemsCliente;
  if (role === "administrador" || user?.email === "admin@costaricacc.com") {
    menuItems = menuItemsAdmin;
  } else if (role === "infraestructura" || role === "infra") {
    menuItems = menuItemsInfra;
  } else if (role === "areas" || role === "áreas" || role === "area") {
    menuItems = menuItemsAreas;
  }
  const drawer = (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <Toolbar />
      {/* Logo superior eliminado */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <List sx={{ flex: 1, px: 1, py: 1 }}>
          {menuItems.map(item => (
            <ListItem
              button
              key={item.text}
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(135deg, rgba(0,131,14,0.3) 0%, rgba(0,168,25,0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(0,131,14,0.15) 0%, rgba(0,168,25,0.1) 100%)',
                  borderLeft: '3px solid #00830e',
                  '& .MuiListItemIcon-root': { color: '#00830e' },
                  '& .MuiListItemText-primary': { fontWeight: 600, color: '#00830e' }
                },
                '&:hover': {
                  background: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.04)',
                  transform: 'translateX(4px)'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ fontSize: '0.9rem' }}
              />
            </ListItem>
          ))}
        </List>
        {/* Usuario activo al final */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 1.5, 
          p: 2, 
          borderTop: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
        }}>
          <img
            src="https://costaricacc.com/cccr/Logoheroica.png"
            alt="Logo Heroica"
            style={{ 
              height: 28, 
              opacity: 1,
              filter: theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
            }}
          />
          <Chip
            avatar={<Avatar sx={{ width: 24, height: 24, bgcolor: '#00830e' }}><AccountCircle sx={{ fontSize: 16 }} /></Avatar>}
            label={user?.email?.split('@')[0] || 'Usuario'}
            size="small"
            sx={{ 
              maxWidth: '100%',
              '& .MuiChip-label': { 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                fontSize: '0.75rem'
              }
            }}
          />
        </Box>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, #00830e 0%, #00a819 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36, 
              mr: 2, 
              bgcolor: 'rgba(255,255,255,0.2)',
              p: 0.5
            }}
          >
            <img
              src="https://costaricacc.com/cccr/Logocccr.png"
              alt="Logo principal"
              style={{
                height: 24,
                filter: 'brightness(0) invert(1)'
              }}
            />
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Gestión de Mobiliario
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={onToggleTheme} 
            title="Cambiar modo claro/oscuro"
            sx={{ 
              mr: 1,
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
            }}
          >
            {theme.palette.mode === "dark" ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton 
            color="inherit" 
            onClick={logout} 
            title="Cerrar sesión"
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': { bgcolor: 'rgba(244,67,54,0.3)' }
            }}
          >
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
