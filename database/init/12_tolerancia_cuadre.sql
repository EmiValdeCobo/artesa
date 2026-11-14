-- Límite de descuadre permitido para cerrar un turno de caja (en dólares, por método de pago).
-- Se cambia con: UPDATE empresa.parametros SET valor = '2.00' WHERE clave = 'tolerancia_cuadre';
INSERT INTO empresa.parametros(clave, valor, descripcion) VALUES
 ('tolerancia_cuadre', '1.00', 'Descuadre máximo (USD, valor absoluto) permitido por método para cerrar un turno de caja')
ON CONFLICT (clave) DO NOTHING;
