-- 004_timestamps.sql  Añade modificado_en a tablas de catálogos/maestros
-- Idempotente: usa IF NOT EXISTS

ALTER TABLE seguridad.usuarios     ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE seguridad.roles        ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE inventario.insumos     ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE inventario.productos   ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE inventario.categorias_producto ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE compras.proveedores    ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE rrhh.empleados         ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE rrhh.puestos           ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE empresa.sucursales     ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;

-- Trigger genérico que actualiza modificado_en al hacer UPDATE
CREATE OR REPLACE FUNCTION public.fn_set_modificado_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.modificado_en = NOW();
  RETURN NEW;
END;
$$;

-- Triggers por tabla (idempotentes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_usuarios_modificado_en') THEN
    CREATE TRIGGER trg_usuarios_modificado_en BEFORE UPDATE ON seguridad.usuarios FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_roles_modificado_en') THEN
    CREATE TRIGGER trg_roles_modificado_en BEFORE UPDATE ON seguridad.roles FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_insumos_modificado_en') THEN
    CREATE TRIGGER trg_insumos_modificado_en BEFORE UPDATE ON inventario.insumos FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_productos_modificado_en') THEN
    CREATE TRIGGER trg_productos_modificado_en BEFORE UPDATE ON inventario.productos FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_categorias_modificado_en') THEN
    CREATE TRIGGER trg_categorias_modificado_en BEFORE UPDATE ON inventario.categorias_producto FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_proveedores_modificado_en') THEN
    CREATE TRIGGER trg_proveedores_modificado_en BEFORE UPDATE ON compras.proveedores FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_empleados_modificado_en') THEN
    CREATE TRIGGER trg_empleados_modificado_en BEFORE UPDATE ON rrhh.empleados FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_puestos_modificado_en') THEN
    CREATE TRIGGER trg_puestos_modificado_en BEFORE UPDATE ON rrhh.puestos FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sucursales_modificado_en') THEN
    CREATE TRIGGER trg_sucursales_modificado_en BEFORE UPDATE ON empresa.sucursales FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
END $$;
