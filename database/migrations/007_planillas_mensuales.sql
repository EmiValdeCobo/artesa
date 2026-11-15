-- Nómina de una sola corrida mensual; valores legales versionados por fecha.
ALTER TABLE rrhh.planillas
  DROP CONSTRAINT IF EXISTS planillas_tipo_periodo_check,
  ADD CONSTRAINT planillas_tipo_periodo_check CHECK (tipo_periodo = 'MENSUAL'),
  ADD COLUMN IF NOT EXISTS id_parametro_legal BIGINT;
ALTER TABLE rrhh.planillas ALTER COLUMN tipo_periodo SET DEFAULT 'MENSUAL';
ALTER TABLE rrhh.planillas DROP CONSTRAINT IF EXISTS planillas_periodo_mensual_check;
ALTER TABLE rrhh.planillas ADD CONSTRAINT planillas_periodo_mensual_check CHECK (
  periodo_inicio = date_trunc('month', periodo_inicio::timestamp)::date
  AND periodo_fin = (date_trunc('month', periodo_inicio::timestamp) + interval '1 month - 1 day')::date
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_planilla_sucursal_mes
  ON rrhh.planillas(id_sucursal, date_trunc('month', periodo_inicio::timestamp));

CREATE TABLE IF NOT EXISTS rrhh.parametros_legales (
  id_parametro BIGSERIAL PRIMARY KEY,
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE,
  afp_empleado NUMERIC(6,5) NOT NULL CHECK (afp_empleado BETWEEN 0 AND 1),
  afp_patronal NUMERIC(6,5) NOT NULL CHECK (afp_patronal BETWEEN 0 AND 1),
  isss_empleado NUMERIC(6,5) NOT NULL CHECK (isss_empleado BETWEEN 0 AND 1),
  isss_patronal NUMERIC(6,5) NOT NULL CHECK (isss_patronal BETWEEN 0 AND 1),
  isss_tope_mensual NUMERIC(10,2) NOT NULL CHECK (isss_tope_mensual > 0),
  insaforp_patronal NUMERIC(6,5) NOT NULL CHECK (insaforp_patronal BETWEEN 0 AND 1),
  fuente TEXT NOT NULL,
  UNIQUE(vigencia_desde),
  CHECK (vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde)
);
ALTER TABLE rrhh.planillas DROP CONSTRAINT IF EXISTS planillas_id_parametro_legal_fkey;
ALTER TABLE rrhh.planillas ADD CONSTRAINT planillas_id_parametro_legal_fkey
  FOREIGN KEY (id_parametro_legal) REFERENCES rrhh.parametros_legales(id_parametro);

ALTER TABLE rrhh.tramos_renta ADD COLUMN IF NOT EXISTS vigencia_desde DATE NOT NULL DEFAULT '2016-01-01';
ALTER TABLE rrhh.tramos_renta ADD COLUMN IF NOT EXISTS vigencia_hasta DATE;
ALTER TABLE rrhh.tramos_renta DROP CONSTRAINT IF EXISTS tramos_renta_tipo_periodo_tramo_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tramo_renta_version
  ON rrhh.tramos_renta(tipo_periodo, tramo, vigencia_desde);

INSERT INTO rrhh.parametros_legales(vigencia_desde, afp_empleado, afp_patronal, isss_empleado,
  isss_patronal, isss_tope_mensual, insaforp_patronal, fuente)
VALUES ('2025-05-01', .0725, .0875, .03, .075, 1000, .01,
  'AFP: Ley Integral del Sistema de Pensiones, art. 16 (SSF, 2023); ISSS: 3% trabajador/7.5% patrono (ISSS, cotizaciones, consultado 2026); tope $1,000 conservado de parámetro base del sistema; INSAFORP: Ley de Formación Profesional, aporte patronal sujeto a empleador obligado.')
ON CONFLICT (vigencia_desde) DO NOTHING;
UPDATE rrhh.parametros_legales SET vigencia_hasta = '2025-04-30' WHERE vigencia_desde = '2016-01-01';
INSERT INTO rrhh.parametros_legales(vigencia_desde, vigencia_hasta, afp_empleado, afp_patronal,
  isss_empleado, isss_patronal, isss_tope_mensual, insaforp_patronal, fuente)
SELECT '2016-01-01', '2025-04-30',
  empresa.fn_param('afp_empleado')::numeric, empresa.fn_param('afp_patronal')::numeric,
  empresa.fn_param('isss_empleado')::numeric, empresa.fn_param('isss_patronal')::numeric,
  empresa.fn_param('isss_base_maxima_mensual')::numeric, empresa.fn_param('insaforp_patronal')::numeric,
  'Parámetros históricos migrados de empresa.parametros (vigencia hasta 2025-04-30).'
WHERE NOT EXISTS (SELECT 1 FROM rrhh.parametros_legales WHERE vigencia_desde = '2016-01-01');

-- Decreto Ejecutivo 10, 30-abr-2025, efectivo desde mayo 2025 (MH, tablas mensuales).
INSERT INTO rrhh.tramos_renta(tipo_periodo,tramo,desde,hasta,cuota_fija,porcentaje,exceso_sobre,vigencia_desde)
VALUES ('MENSUAL','I',.01,550,0,0,0,'2025-05-01'),
 ('MENSUAL','II',550.01,895.24,17.67,.10,550,'2025-05-01'),
 ('MENSUAL','III',895.25,2038.10,60,.20,895.24,'2025-05-01'),
 ('MENSUAL','IV',2038.11,NULL,288.57,.30,2038.10,'2025-05-01')
ON CONFLICT (tipo_periodo,tramo,vigencia_desde) DO UPDATE SET
 desde=EXCLUDED.desde,hasta=EXCLUDED.hasta,cuota_fija=EXCLUDED.cuota_fija,
 porcentaje=EXCLUDED.porcentaje,exceso_sobre=EXCLUDED.exceso_sobre;
UPDATE rrhh.tramos_renta SET vigencia_hasta='2025-04-30'
WHERE tipo_periodo='MENSUAL' AND vigencia_desde<'2025-05-01' AND vigencia_hasta IS NULL;

CREATE TABLE IF NOT EXISTS rrhh.planilla_ajustes (
  id_planilla INT NOT NULL REFERENCES rrhh.planillas(id_planilla) ON DELETE CASCADE,
  id_empleado UUID NOT NULL REFERENCES rrhh.empleados(id_empleado),
  bonificaciones NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (bonificaciones >= 0),
  otros_descuentos NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (otros_descuentos >= 0),
  detalle JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY(id_planilla,id_empleado)
);

CREATE OR REPLACE FUNCTION rrhh.fn_calcular_planilla(p_id_planilla INT) RETURNS INT AS $$
DECLARE pl rrhh.planillas%ROWTYPE; par rrhh.parametros_legales%ROWTYPE;
  e RECORD; t rrhh.tramos_renta%ROWTYPE; v_bruto NUMERIC; v_isss NUMERIC; v_afp NUMERIC;
  v_base NUMERIC; v_renta NUMERIC; v_bonus NUMERIC; v_otros NUMERIC; v_n INT := 0; v_empresa_empleados INT;
BEGIN
  SELECT * INTO pl FROM rrhh.planillas WHERE id_planilla=p_id_planilla FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Planilla no existe'; END IF;
  IF pl.procesada THEN RAISE EXCEPTION 'La planilla ya fue procesada y no se puede recalcular'; END IF;
  SELECT * INTO par FROM rrhh.parametros_legales
    WHERE vigencia_desde <= pl.periodo_inicio AND (vigencia_hasta IS NULL OR vigencia_hasta >= pl.periodo_inicio)
    ORDER BY vigencia_desde DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No hay parámetros legales vigentes para el período'; END IF;
  UPDATE rrhh.planillas SET id_parametro_legal=par.id_parametro WHERE id_planilla=p_id_planilla;
  DELETE FROM rrhh.planilla_detalles WHERE id_planilla=p_id_planilla;
  SELECT count(*)::int INTO v_empresa_empleados FROM rrhh.empleados WHERE activo;
  FOR e IN SELECT emp.*, COALESCE(a.bonificaciones,0) bonus, COALESCE(a.otros_descuentos,0) otros
    FROM rrhh.empleados emp LEFT JOIN rrhh.planilla_ajustes a ON a.id_planilla=p_id_planilla AND a.id_empleado=emp.id_empleado
    WHERE emp.id_sucursal=pl.id_sucursal AND emp.activo LOOP
    v_bruto := e.salario_nominal;
    v_bonus := e.bonus; v_otros := e.otros;
    v_isss := ROUND(LEAST(v_bruto + v_bonus, par.isss_tope_mensual) * par.isss_empleado,2);
    v_afp := ROUND((v_bruto + v_bonus) * par.afp_empleado,2);
    v_base := v_bruto + v_bonus - v_isss - v_afp;
    SELECT * INTO t FROM rrhh.tramos_renta
      WHERE tipo_periodo='MENSUAL' AND vigencia_desde<=pl.periodo_inicio
        AND (vigencia_hasta IS NULL OR vigencia_hasta>=pl.periodo_inicio)
        AND v_base>=desde AND (hasta IS NULL OR v_base<=hasta)
      ORDER BY vigencia_desde DESC LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'No existe tramo de renta para la base del empleado %', e.id_empleado; END IF;
    v_renta := CASE WHEN t.porcentaje=0 THEN 0 ELSE GREATEST(0,ROUND(t.cuota_fija+(v_base-t.exceso_sobre)*t.porcentaje,2)) END;
    IF v_otros > v_bruto + v_bonus - v_isss - v_afp - v_renta THEN
      RAISE EXCEPTION 'Los otros descuentos superan el salario líquido disponible del empleado %', e.id_empleado;
    END IF;
    INSERT INTO rrhh.planilla_detalles(id_planilla,id_empleado,salario_bruto,bonificaciones,isss_laboral,
      afp_laboral,renta_retenida,otros_descuentos,total_descuentos,salario_neto,isss_patronal,afp_patronal,insaforp_patronal)
    VALUES(p_id_planilla,e.id_empleado,v_bruto,v_bonus,v_isss,v_afp,v_renta,v_otros,
      v_isss+v_afp+v_renta+v_otros,v_bruto+v_bonus-v_isss-v_afp-v_renta-v_otros,
      ROUND(LEAST(v_bruto+v_bonus,par.isss_tope_mensual)*par.isss_patronal,2),
      ROUND((v_bruto+v_bonus)*par.afp_patronal,2),
      CASE WHEN v_empresa_empleados>=10
        THEN ROUND((v_bruto+v_bonus)*par.insaforp_patronal,2) ELSE 0 END);
    v_n:=v_n+1;
  END LOOP;
  RETURN v_n;
END;
$$ LANGUAGE plpgsql;

INSERT INTO seguridad.permisos(codigo,modulo,descripcion) VALUES
 ('RRHH_CALCULAR_PLANILLA','RRHH','Crear, calcular y procesar planillas mensuales'),
 ('RRHH_VER_PLANILLA','RRHH','Consultar planillas y boletas mensuales')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO seguridad.roles_permisos(id_rol,id_permiso)
SELECT r.id_rol,p.id_permiso FROM seguridad.roles r CROSS JOIN seguridad.permisos p
WHERE r.nombre IN ('ADMIN','RRHH') AND p.codigo IN ('RRHH_CALCULAR_PLANILLA','RRHH_VER_PLANILLA')
ON CONFLICT DO NOTHING;
