// Enlace de contacto con soporte (opcional): VITE_SOPORTE_CONTACTO puede ser un correo o una URL.
// Si no está definido, la interfaz simplemente no ofrece el botón "Contactar a soporte".
export function enlaceSoporte() {
  const contacto = import.meta.env.VITE_SOPORTE_CONTACTO;
  if (!contacto) return null;
  return /^(https?:|mailto:)/i.test(contacto) ? contacto : `mailto:${contacto}`;
}
