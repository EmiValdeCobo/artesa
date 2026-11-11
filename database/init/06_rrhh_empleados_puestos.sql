-- Espejo de database/migrations/006_rrhh_empleados_puestos.sql para instalaciones nuevas.
ALTER TABLE rrhh.puestos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO rrhh.puestos(nombre, salario_base) VALUES
  ('Gerente General', 1500.00), ('Chef de Cocina', 1100.00), ('Sous Chef', 850.00),
  ('Cocinero', 600.00), ('Ayudante de Cocina', 450.00), ('Mesero', 450.00),
  ('Hostess', 500.00), ('Bartender', 600.00), ('Barista', 500.00),
  ('Cajero', 500.00), ('Contador', 900.00), ('Encargado de Compras', 800.00)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO rrhh.empleados(id_sucursal, id_puesto, nombres, apellidos, dui, nit, fecha_ingreso, salario_nominal)
SELECT v.id_sucursal, p.id_puesto, v.nombres, v.apellidos, v.dui, v.nit, v.fecha_ingreso::date, v.salario_nominal
FROM (VALUES
  (1, 'Gerente General', 'Laura', 'Méndez', '10567890-1', '0614-090190-101-1', '2024-01-15', 1500.00),
  (1, 'Chef de Cocina', 'Carlos', 'Pineda', '11567890-2', '0614-120285-102-2', '2024-02-01', 1100.00),
  (1, 'Sous Chef', 'Ana', 'Rivas', '12567890-3', '0614-180390-103-3', '2024-03-04', 850.00),
  (1, 'Cocinero', 'Miguel', 'Alas', '13567890-4', '0614-220492-104-4', '2024-04-08', 600.00),
  (1, 'Ayudante de Cocina', 'Sofía', 'Cruz', '14567890-5', '0614-030598-105-5', '2024-05-13', 450.00),
  (2, 'Mesero', 'Diego', 'Hernández', '15567890-6', '0614-110795-106-6', '2024-06-03', 450.00),
  (2, 'Hostess', 'Mariana', 'Flores', '16567890-7', '0614-250199-107-7', '2024-06-17', 500.00),
  (2, 'Bartender', 'Javier', 'Torres', '17567890-8', '0614-070287-108-8', '2024-07-01', 600.00),
  (2, 'Barista', 'Valeria', 'Núñez', '18567890-9', '0614-140696-109-9', '2024-07-15', 500.00),
  (1, 'Cajero', 'Paola', 'Ramírez', '19567890-0', '0614-210193-110-0', '2024-08-05', 500.00),
  (1, 'Contador', 'Fernando', 'Castillo', '20567890-1', '0614-020182-111-1', '2024-08-19', 900.00),
  (2, 'Encargado de Compras', 'Gabriela', 'Molina', '21567890-2', '0614-300388-112-2', '2024-09-02', 800.00)
) AS v(id_sucursal, puesto, nombres, apellidos, dui, nit, fecha_ingreso, salario_nominal)
JOIN rrhh.puestos p ON p.nombre = v.puesto
ON CONFLICT (dui) DO NOTHING;
