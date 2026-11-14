import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, EVENTO_SESION_EXPIRADA } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [tipoSesion, setTipoSesion] = useState(null);
  const [cargando, setCargando] = useState(true);

  const recargarSesion = useCallback(async (tipoParam) => {
    const tipo = tipoParam || localStorage.getItem('tipoSesion') || 'admin';
    try {
      const data = await api.get(tipo === 'cliente' ? '/auth/cliente/me' : '/auth/me');
      setUsuario(data.usuario);
      setPermisos(data.permisos || []);
      setTipoSesion(tipo);
      return data;
    } catch (err) {
      setUsuario(null);
      setPermisos([]);
      setTipoSesion(null);
      throw err;
    }
  }, []);

  useEffect(() => {
    recargarSesion()
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [recargarSesion]);

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
    <AuthContext.Provider value={{ usuario, tipoSesion, cargando, login: iniciarSesion, logout, tiene, recargarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
