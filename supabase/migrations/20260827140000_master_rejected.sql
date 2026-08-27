-- Estado 'rejected': el admin rechazó/bloqueó al master; no puede volver a solicitar.
ALTER TYPE public.master_status ADD VALUE IF NOT EXISTS 'rejected';

COMMENT ON TYPE public.master_status
  IS 'Estado de autorización del master: created (nuevo), pending (solicitada), authorized (aprobado) o rejected (rechazado/bloqueado).';

-- Fix trigger: un owner solo puede solicitar autorización (created -> pending).
-- Autorizar, rechazar, desbloquear y desautorizar quedan reservados a admins.
-- Esto además impide que un master rechazado (rejected) vuelva a solicitar vía RPC.
CREATE OR REPLACE FUNCTION public.guard_master_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM "public"."admins" "a"
    WHERE "a"."id" = auth.uid()
  )
  INTO v_is_admin;

  IF NEW."status" IS DISTINCT FROM OLD."status"
     AND NOT v_is_admin
     AND NOT (OLD."status" = 'created' AND NEW."status" = 'pending') THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el estado del master'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.guard_master_status_update() OWNER TO "postgres";