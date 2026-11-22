-- AlterTable
CREATE SEQUENCE pesos_version_seq;
ALTER TABLE "Pesos" ALTER COLUMN "version" SET DEFAULT nextval('pesos_version_seq');
ALTER SEQUENCE pesos_version_seq OWNED BY "Pesos"."version";
