import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCargando(false);
      return;
    }
    api.get('/auth/me')
      .then((data) => {
        setUsuario(data.usuario);
        setPermisos(data.permisos || []);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setUsuario(null);
        setPermisos([]);
      })
      .finally(() => setCargando(false));
  }, []);

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    setUsuario(data.usuario);
    setPermisos(data.permisos || []);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
    setPermisos([]);
  };

  const tiene = (permiso) => permisos.includes(permiso);

  return (
    <AuthContext.Provider value={{ usuario, permisos, cargando, login, logout, tiene }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
