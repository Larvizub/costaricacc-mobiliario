# Gestión de Mobiliario — Centro de Convenciones Costa Rica

Aplicación web para gestión y consulta de mobiliario y activos del Centro de Convenciones Costa Rica.
Interfaz construida con React, Material UI y visualizaciones con Recharts. Autenticación y datos via Firebase Realtime Database.

---

## Resumen
- Propósito: Permitir a usuarios y personal de infraestructura/áreas solicitar, autorizar, entregar y administrar mobiliario.
- Características: creación de solicitudes, autorizaciones, inventario, gestión de reparaciones, entrega de activos, historial, notificaciones y preferencias.
- UI: Material UI (MUI v5) con tema personalizado (gradientes verdes), diseño responsivo y estilo "glassmorphism" en formularios.

## Tecnologías
- Frontend: React (Vite)
- UI: MUI v5
- Gráficos: Recharts
- Backend / BBDD: Firebase Realtime Database, Firebase Auth
- Herramientas: pnpm, Firebase CLI

## Requisitos
- Node.js (>=16) y `pnpm` instalado
- Cuenta Firebase con proyecto creado (Realtime Database + Auth)
- Firebase CLI configurado localmente si se desplegará

## Configuración local
1. Clonar el repositorio:

```bash
git clone https://github.com/Larvizub/costaricacc-mobiliario.git
cd costaricacc-mobiliario
```

2. Instalar dependencias:

```bash
pnpm install
```

3. Crear archivo de configuración de Firebase (revisar `src/firebase.js`):
- Añade tu `apiKey`, `authDomain`, `databaseURL`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
- Para desarrollo puedes usar el emulador de Firebase si lo prefieres.

Ejemplo mínimo (en `src/firebase.js`):
```js
// export const firebaseConfig = {
//   apiKey: "...",
//   authDomain: "...",
//   databaseURL: "...",
//   projectId: "...",
//   storageBucket: "...",
//   messagingSenderId: "...",
//   appId: "..."
// };
```

4. Ejecutar en modo desarrollo:

```bash
pnpm run dev
```
- La aplicación inicia usualmente en `http://localhost:5173` o el puerto que Vite asigne.

## Comandos útiles
- Desarrollo: `pnpm run dev`
- Build de producción: `pnpm run build`
- Previsualizar build localmente (si está configurado): `pnpm run preview`
- Deploy a Firebase Hosting (desde la raíz del proyecto):

```bash
firebase deploy --only hosting
```

> Nota: Antes de ejecutar `firebase deploy`, asegúrate de estar autenticado con `firebase login` y de seleccionar el proyecto correcto con `firebase use`.

## Estructura del proyecto (resumen)
- `src/`
  - `App.jsx` — Rutas de la app
  - `main.jsx` — Entrada y theme provider
  - `firebase.js` — Configuración y exportes de Firebase
  - `components/` — Componentes compartidos (`MainLayout.jsx`, etc.)
  - `pages/` — Vistas principales (Dashboard, LoginPage, Inventario, Solicitud, Entregas, Reparacion, etc.)
  - `contexts/` — Contextos React (ej. `AuthContext.jsx`)
  - `theme/` — Tema MUI personalizado
  - `utils/` — Utilidades (email, importación excel, ...)
- `functions/` — (opcional) funciones cloud (si están usadas)
- `firebase.json`, `sw.js`, manifest, etc. — Configs y PWA

## Estilo y UX
- Tema principal usa un gradiente verde (`#00830e → #006400`).
- Se ha aplicado un sistema visual coherente (cabeceras con icono en caja gradient, tarjetas con sombras suaves, modales con cabecera gradient y bordes redondeados).
- Soporte claro/oscuro adaptado vía `theme.palette.mode`.

## Logos y assets
- Los logos se cargan desde URLs remotas (`https://costaricacc.com/cccr/Logocccr.png`, `Logoheroica.png`).
- En modo oscuro se aplica un filtro CSS (`filter: 'brightness(0) invert(1)'`) para asegurar buena legibilidad.

## Seguridad y buenas prácticas
- No subir credenciales ni claves al repositorio. Utiliza variables de entorno o configuración segura para `firebaseConfig`.
- Reutilizar instancias `CosmosClient`/`Firebase` (en este proyecto: no crear múltiples clientes innecesarios).

## Contribuir
1. Crear una rama a partir de `main`: `git checkout -b feature/mi-cambio`
2. Implementar cambios y añadir tests si aplica
3. Hacer PR al repositorio principal y pedir revisión

## Notas del mantenedor
- Dev server puede abrir en otro puerto si el predeterminado está ocupado (Vite asigna uno disponible).
- Módulos con permisos especiales: algunos módulos (ej. `TiempoCarga`, `EntregaActivos`) están restringidos a roles de infraestructura.

## Contacto
- Repositorio: https://github.com/Larvizub/costaricacc-mobiliario
- Responsable: Equipo de desarrollo — Centro de Convenciones Costa Rica

---

Si quieres, puedo:
- Añadir badges (build, deploy, license) al inicio del README.
- Generar una guía rápida de despliegue paso a paso para Firebase (incluyendo `firebase init hosting`).
- Añadir instrucciones de entorno (archivo `.env.example`) y modificación de `src/firebase.js` para usar variables de entorno.

Indica si quieres alguna de estas mejoras y la aplico.