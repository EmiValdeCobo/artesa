import {
  BarChart3, BookOpen, ClipboardCheck, Edit3, Eye, KeyRound, LayoutDashboard, Lock, Package, Plus, Power, PowerOff,
  RefreshCw, Ruler, Save, ScrollText, Search, Settings, ShieldCheck, Store, Trash2, Undo2, UserCheck, Users, UserX, X,
} from 'lucide-react';

// Iconografía única de la administración. La referencia es el módulo de Usuarios:
// Edit3 = editar · Plus = crear · Trash2 = eliminar · Search = buscar · X = cerrar.
// Las pantallas importan desde aquí en lugar de elegir su propio icono para la misma acción.
export const ICONOS = {
  crear: Plus,
  editar: Edit3,
  eliminar: Trash2,
  guardar: Save,
  deshacer: Undo2,
  buscar: Search,
  cerrar: X,
  ver: Eye,
  actualizar: RefreshCw,
  bloqueado: Lock,
  activar: Power,
  desactivar: PowerOff,
  activarUsuario: UserCheck,
  desactivarUsuario: UserX,
  apertura: ClipboardCheck,
  // Módulos (coinciden con el menú lateral)
  inicio: LayoutDashboard,
  rol: ShieldCheck,
  permiso: KeyRound,
  usuarios: Users,
  sucursal: Store,
  parametros: Settings,
  bitacora: ScrollText,
  reportes: BarChart3,
  catalogo: BookOpen,
  insumo: Package,
  unidad: Ruler,
};
