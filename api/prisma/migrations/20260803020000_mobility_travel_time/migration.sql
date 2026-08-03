-- Mobilidade deixa de ser divisão administrativa (cidade/estado) e vira tempo
-- de viagem estimado (MAX_30MIN/MAX_1H/MAX_2H) + ANYWHERE (topo me mudar).
-- Feature ainda não lançada: a tabela é esvaziada em vez de migrar valores.
DELETE FROM "user_preferences";

CREATE TYPE "PreferenceMobility_new" AS ENUM ('MAX_30MIN', 'MAX_1H', 'MAX_2H', 'ANYWHERE');
ALTER TABLE "user_preferences"
  ALTER COLUMN "mobility" TYPE "PreferenceMobility_new"
  USING ('ANYWHERE'::"PreferenceMobility_new");
DROP TYPE "PreferenceMobility";
ALTER TYPE "PreferenceMobility_new" RENAME TO "PreferenceMobility";
