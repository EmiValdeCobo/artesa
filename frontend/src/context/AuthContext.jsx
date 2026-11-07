import { createContext, useContext, useState, useEffect } from 'react';
import { api, EVENTO_SESION_EXPIRADA } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [tipoSesion, setTipoSesion] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const tipo = localStorage.getItem('tipoSesion') || 'admin';
    api.get(tipo === 'cliente' ? '/auth/cliente/me' : '/auth/me')
      .then((data) => {
        setUsuario(data.usuario);
        setPermisos(data.permisos || []);
        setTipoSesion(tipo);
      })
      .catch(() => {
        setUsuario(null);
        setPermisos([]);
        setTipoSesion(null);
      })
      .finally(() => setCargando(false));
  }, []);

  // La sesión venció a mitad de uso: se limpia el estado y ProtectedRoute lleva al login.
  // El aviso al usuario lo muestra AlertProvider (un solo toast, aunque fallen varias peticiones).
  useEffect(() => {
    const alVencer = () => {
      localStorage.removeItem('tipoSesion');
      setUsuario(null);
      setPermisos([]);
      setTipoSesion(null);
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, alVencer);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alVencer);
  }, []);

  const iniciarSesion = async (username, password, tipo = 'admin') => {
    const endpoint = tipo === 'cliente' ? '/auth/cliente/login' : '/auth/login';
    const data = await api.post(endpoint, { username, password });
    localStorage.setItem('tipoSesion', tipo);
    setUsuario(data.usuario);
    setPermisos(data.permisos || []);
    setTipoSesion(tipo);
    return data;
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('tipoSesion');
    setUsuario(null);
    setPermisos([]);
    setTipoSesion(null);
  };

  const tiene = (permiso) => permisos.includes(permiso);

  return (
    <AuthContext.Provider value={{ usuario, tipoSesion, cargando, login: iniciarSesion, logout, tiene }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
