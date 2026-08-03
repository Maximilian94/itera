-- Escopo de busca do perfil de preferências:
-- - novo valor STATE no enum (estado inteiro — qualquer cidade da UF);
-- - âncora (state/city) vira opcional: ANYWHERE não tem âncora nenhuma,
--   STATE tem só a UF. A obrigatoriedade condicional é regra de serviço.
ALTER TYPE "PreferenceMobility" ADD VALUE 'STATE' BEFORE 'ANYWHERE';

ALTER TABLE "user_preferences" ALTER COLUMN "state" DROP NOT NULL;
ALTER TABLE "user_preferences" ALTER COLUMN "city" DROP NOT NULL;
