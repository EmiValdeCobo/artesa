-- 007_inventario_unidades_medida.sql: añade columnas factor_conversion y activo a inventario.unidades_medida
-- Idempotente: usa IF NOT EXISTS

ALTER TABLE inventario.unidades_medida
  ADD COLUMN IF NOT EXISTS factor_conversion NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_unidades_medida_modificado_en') THEN
    CREATE TRIGGER trg_unidades_medida_modificado_en BEFORE UPDATE ON inventario.unidades_medida FOR EACH ROW EXECUTE FUNCTION public.fn_set_modificado_en();
  END IF;
END $$;

INSERT INTO inventario.unidades_medida (codigo, nombre, factor_conversion, activo) VALUES
  ('KG', 'Kilogramo', 1000.0000, true),
  ('L', 'Litro', 1000.0000, true),
  ('OZ', 'Onza', 28.3495, true),
  ('BOLSA', 'Bolsa', 1.0000, true),
  ('PORCION', 'Porción', 1.0000, true)
ON CONFLICT (codigo) DO NOTHING;
