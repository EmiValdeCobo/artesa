---
name: nueva-pantalla-react
description: Crear una pantalla/página React con Tailwind, router, permisos y consumo de API.
---
1. Crea `frontend/src/modules/<m>/<Nombre>Page.jsx` (componente funcional con hooks: `useState`, `useEffect`).
2. Datos: usa `api` de `src/api/client.js` (`api.get('/ruta')`) dentro de `try/catch`; maneja estados `cargando`, `error`, `datos`. Listas con `.map()` y `key`.
3. UI con clases Tailwind; reutiliza componentes de `src/components/`. Textos en español.
4. Ruta: añádela en `src/App.jsx` envuelta en `<ProtectedRoute permiso="CODIGO">`.
5. Menú: añade el ítem en `src/config/menu.js` con su `permiso` (el menú se filtra solo).
6. Botones sensibles: `const { tiene } = useAuth(); {tiene('POS_ANULAR_VENTA') && <button…/>}` (el backend igual valida).
7. Responsive y accesible (labels, contraste). Luego skill `registrar-cambio`.
