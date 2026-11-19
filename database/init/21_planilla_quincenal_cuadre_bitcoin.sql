-- 1) Planilla QUINCENAL además de MENSUAL (el enunciado exige planilla quincenal).
--    Quincena 1 = días 1-15; quincena 2 = día 16 a fin de mes. El salario nominal sigue siendo MENSUAL:
--    en quincenal se liquida la mitad, con tope ISSS y tramos de renta quincenales.
ALTER TABLE rrhh.planillas DROP CONSTRAINT IF EXISTS planillas_tipo_periodo_check;
ALTER TABLE rrhh.planillas ADD CONSTRAINT planillas_tipo_periodo_check
  CHECK (tipo_periodo IN ('QUINCENAL','MENSUAL'));
ALTER TABLE rrhh.planillas DROP CONSTRAINT IF EXISTS planillas_periodo_mensual_check;
ALTER TABLE rrhh.planillas DROP CONSTRAINT IF EXISTS planillas_periodo_check;
ALTER TABLE rrhh.planillas ADD CONSTRAINT planillas_periodo_check CHECK (
  (tipo_periodo = 'MENSUAL'
    AND periodo_inicio = date_trunc('month', periodo_inicio::timestamp)::date
    AND periodo_fin = (date_trunc('month', periodo_inicio::timestamp) + interval '1 month - 1 day')::date)
  OR (tipo_periodo = 'QUINCENAL' AND (
    (EXTRACT(DAY FROM periodo_inicio) = 1 AND periodo_fin = periodo_inicio + 14)
    OR (EXTRACT(DAY FROM periodo_inicio) = 16
        AND periodo_fin = (date_trunc('month', periodo_inicio::timestamp) + interval '1 month - 1 day')::date)))
);
-- Una planilla por sucursal y fecha de inicio; el traslape (mensual vs quincena del mismo mes) lo frena el trigger.
DROP INDEX IF EXISTS rrhh.uq_planilla_sucursal_mes;
CREATE UNIQUE INDEX IF NOT EXISTS uq_planilla_sucursal_inicio ON rrhh.planillas(id_sucursal, periodo_inicio);

CREATE OR REPLACE FUNCTION rrhh.fn_validar_traslape_planilla() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM rrhh.planillas p
             WHERE p.id_sucursal = NEW.id_sucursal AND p.id_planilla IS DISTINCT FROM NEW.id_planilla
               AND p.periodo_inicio <= NEW.periodo_fin AND p.periodo_fin >= NEW.periodo_inicio) THEN
    RAISE EXCEPTION 'Ya existe una planilla de la sucursal que cubre parte del período % a %', NEW.periodo_inicio, NEW.periodo_fin;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_planilla_traslape ON rrhh.planillas;
CREATE TRIGGER trg_planilla_traslape BEFORE INSERT OR UPDATE OF id_sucursal, periodo_inicio, periodo_fin
  ON rrhh.planillas FOR EACH ROW EXECUTE FUNCTION rrhh.fn_validar_traslape_planilla();

-- Tablas quincenales del Decreto Ejecutivo 10 (vigentes desde mayo 2025, mitad de la tabla mensual).
INSERT INTO rrhh.tramos_renta(tipo_periodo,tramo,desde,hasta,cuota_fija,porcentaje,exceso_sobre,vigencia_desde)
VALUES ('QUINCENAL','I',.01,275,0,0,0,'2025-05-01'),
 ('QUINCENAL','II',275.01,447.62,8.83,.10,275,'2025-05-01'),
 ('QUINCENAL','III',447.63,1019.05,30,.20,447.62,'2025-05-01'),
 ('QUINCENAL','IV',1019.06,NULL,144.28,.30,1019.05,'2025-05-01')
ON CONFLICT (tipo_periodo,tramo,vigencia_desde) DO UPDATE SET
 desde=EXCLUDED.desde,hasta=EXCLUDED.hasta,cuota_fija=EXCLUDED.cuota_fija,
 porcentaje=EXCLUDED.porcentaje,exceso_sobre=EXCLUDED.exceso_sobre;
UPDATE rrhh.tramos_renta SET vigencia_hasta='2025-04-30'
WHERE tipo_periodo='QUINCENAL' AND vigencia_desde<'2025-05-01' AND vigencia_hasta IS NULL;

CREATE OR REPLACE FUNCTION rrhh.fn_calcular_planilla(p_id_planilla INT) RETURNS INT AS $$
DECLARE pl rrhh.planillas%ROWTYPE; par rrhh.parametros_legales%ROWTYPE;
  e RECORD; t rrhh.tramos_renta%ROWTYPE; v_bruto NUMERIC; v_isss NUMERIC; v_afp NUMERIC;
  v_base NUMERIC; v_renta NUMERIC; v_bonus NUMERIC; v_otros NUMERIC; v_n INT := 0; v_empresa_empleados INT;
  v_factor INT; v_tope NUMERIC;
BEGIN
  SELECT * INTO pl FROM rrhh.planillas WHERE id_planilla=p_id_planilla FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Planilla no existe'; END IF;
  IF pl.procesada THEN RAISE EXCEPTION 'La planilla ya fue procesada y no se puede recalcular'; END IF;
  SELECT * INTO par FROM rrhh.parametros_legales
    WHERE vigencia_desde <= pl.periodo_inicio AND (vigencia_hasta IS NULL OR vigencia_hasta >= pl.periodo_inicio)
    ORDER BY vigencia_desde DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No hay parámetros legales vigentes para el período'; END IF;
  v_factor := CASE pl.tipo_periodo WHEN 'QUINCENAL' THEN 2 ELSE 1 END;   -- períodos de pago en el mes
  v_tope := par.isss_tope_mensual / v_factor;                              -- tope ISSS proporcional
  UPDATE rrhh.planillas SET id_parametro_legal=par.id_parametro WHERE id_planilla=p_id_planilla;
  DELETE FROM rrhh.planilla_detalles WHERE id_planilla=p_id_planilla;
  SELECT count(*)::int INTO v_empresa_empleados FROM rrhh.empleados WHERE activo;
  FOR e IN SELECT emp.*, COALESCE(a.bonificaciones,0) bonus, COALESCE(a.otros_descuentos,0) otros
    FROM rrhh.empleados emp LEFT JOIN rrhh.planilla_ajustes a ON a.id_planilla=p_id_planilla AND a.id_empleado=emp.id_empleado
    WHERE emp.id_sucursal=pl.id_sucursal AND emp.activo LOOP
    v_bruto := ROUND(e.salario_nominal / v_factor, 2);                     -- salario nominal es mensual
    v_bonus := e.bonus; v_otros := e.otros;
    v_isss := ROUND(LEAST(v_bruto + v_bonus, v_tope) * par.isss_empleado,2);
    v_afp := ROUND((v_bruto + v_bonus) * par.afp_empleado,2);
    v_base := v_bruto + v_bonus - v_isss - v_afp;
    SELECT * INTO t FROM rrhh.tramos_renta
      WHERE tipo_periodo=pl.tipo_periodo AND vigencia_desde<=pl.periodo_inicio
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
      ROUND(LEAST(v_bruto+v_bonus,v_tope)*par.isss_patronal,2),
      ROUND((v_bruto+v_bonus)*par.afp_patronal,2),
      CASE WHEN v_empresa_empleados>=10
        THEN ROUND((v_bruto+v_bonus)*par.insaforp_patronal,2) ELSE 0 END);
    v_n:=v_n+1;
  END LOOP;
  RETURN v_n;
END;
$$ LANGUAGE plpgsql;

-- 2) Cuadre de caja con Bitcoin/Chivo como método propio. "digital" pasa a ser solo TRANSFERENCIA.
--    Turnos cerrados antes de esta migración conservan su digital congelado (incluía Bitcoin) y bitcoin en NULL.
ALTER TABLE pos.turnos_caja
  ADD COLUMN IF NOT EXISTS monto_cierre_bitcoin NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS esperado_bitcoin     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS dif_bitcoin          NUMERIC(10,2);
COMMENT ON COLUMN pos.turnos_caja.monto_cierre_digital IS 'Transferencias contadas (antes de mig. 019 incluía Bitcoin/Chivo)';
COMMENT ON COLUMN pos.turnos_caja.monto_cierre_bitcoin IS 'Bitcoin/Chivo Wallet contado al cierre';

CREATE OR REPLACE VIEW reportes.vw_cuadre_turno AS
SELECT t.id_turno, c.id_sucursal, t.id_caja, t.id_usuario, t.estado, t.monto_apertura,
       COALESCE(pg.efectivo, 0) AS ventas_efectivo, COALESCE(pg.tarjeta, 0) AS ventas_tarjeta, COALESCE(pg.digital, 0) AS ventas_digital,
       COALESCE(mc.ingresos, 0) AS ingresos_caja, COALESCE(mc.egresos, 0) AS egresos_caja,
       t.monto_apertura + COALESCE(pg.efectivo, 0) + COALESCE(mc.ingresos, 0) - COALESCE(mc.egresos, 0) AS esperado_efectivo,
       COALESCE(pg.tarjeta, 0) AS esperado_tarjeta,
       COALESCE(pg.digital, 0) AS esperado_digital,
       t.monto_cierre_efectivo, t.monto_cierre_pos_tarjeta, t.monto_cierre_digital,
       t.dif_efectivo, t.dif_tarjeta, t.dif_digital,
       COALESCE(pg.bitcoin, 0) AS ventas_bitcoin,
       COALESCE(pg.bitcoin, 0) AS esperado_bitcoin,
       t.monto_cierre_bitcoin, t.dif_bitcoin
FROM pos.turnos_caja t
JOIN pos.cajas c ON c.id_caja = t.id_caja
LEFT JOIN LATERAL (
    SELECT SUM(p.monto) FILTER (WHERE p.metodo = 'EFECTIVO') AS efectivo,
           SUM(p.monto) FILTER (WHERE p.metodo = 'TARJETA') AS tarjeta,
           SUM(p.monto) FILTER (WHERE p.metodo = 'TRANSFERENCIA') AS digital,
           SUM(p.monto) FILTER (WHERE p.metodo = 'BITCOIN_CHIVO') AS bitcoin
    FROM pos.pagos p JOIN pos.ventas v ON v.id_venta = p.id_venta
    WHERE v.id_turno = t.id_turno AND v.estado = 'EMITIDA') pg ON TRUE
LEFT JOIN LATERAL (
    SELECT SUM(monto) FILTER (WHERE tipo = 'INGRESO') AS ingresos, SUM(monto) FILTER (WHERE tipo = 'EGRESO') AS egresos
    FROM pos.movimientos_caja WHERE id_turno = t.id_turno) mc ON TRUE;

DROP FUNCTION IF EXISTS pos.fn_cerrar_turno(UUID, NUMERIC, NUMERIC, NUMERIC);
CREATE OR REPLACE FUNCTION pos.fn_cerrar_turno(p_id_turno UUID, p_efectivo NUMERIC, p_tarjeta NUMERIC,
                                               p_digital NUMERIC, p_bitcoin NUMERIC) RETURNS JSONB AS $$
DECLARE v RECORD; v_estado TEXT;
BEGIN
    SELECT estado INTO v_estado FROM pos.turnos_caja WHERE id_turno = p_id_turno FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Turno no existe'; END IF;
    IF v_estado <> 'ABIERTO' THEN RAISE EXCEPTION 'El turno ya está cerrado'; END IF;

    SELECT * INTO v FROM reportes.vw_cuadre_turno WHERE id_turno = p_id_turno;

    UPDATE pos.turnos_caja SET
        monto_cierre_efectivo = p_efectivo, monto_cierre_pos_tarjeta = p_tarjeta,
        monto_cierre_digital = p_digital, monto_cierre_bitcoin = p_bitcoin,
        esperado_efectivo = v.esperado_efectivo, esperado_tarjeta = v.esperado_tarjeta,
        esperado_digital = v.esperado_digital, esperado_bitcoin = v.esperado_bitcoin,
        dif_efectivo = p_efectivo - v.esperado_efectivo, dif_tarjeta = p_tarjeta - v.esperado_tarjeta,
        dif_digital = p_digital - v.esperado_digital, dif_bitcoin = p_bitcoin - v.esperado_bitcoin,
        cerrado_en = now(), estado = 'CERRADO'
    WHERE id_turno = p_id_turno;

    RETURN jsonb_build_object(
        'efectivo', jsonb_build_object('esperado', v.esperado_efectivo, 'contado', p_efectivo, 'diferencia', p_efectivo - v.esperado_efectivo),
        'tarjeta',  jsonb_build_object('esperado', v.esperado_tarjeta,  'contado', p_tarjeta,  'diferencia', p_tarjeta  - v.esperado_tarjeta),
        'digital',  jsonb_build_object('esperado', v.esperado_digital,  'contado', p_digital,  'diferencia', p_digital  - v.esperado_digital),
        'bitcoin',  jsonb_build_object('esperado', v.esperado_bitcoin,  'contado', p_bitcoin,  'diferencia', p_bitcoin  - v.esperado_bitcoin));
END;
$$ LANGUAGE plpgsql;
-- web_user ejecuta la firma nueva (5 parámetros) y lee la vista recreada.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_user') THEN
        GRANT EXECUTE ON FUNCTION pos.fn_cerrar_turno(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO web_user;
        GRANT EXECUTE ON FUNCTION rrhh.fn_validar_traslape_planilla() TO web_user;
        GRANT SELECT ON reportes.vw_cuadre_turno TO web_user;
    END IF;
END $$;
