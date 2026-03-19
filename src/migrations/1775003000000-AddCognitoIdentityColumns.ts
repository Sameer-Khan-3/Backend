import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCognitoIdentityColumns1775003000000
  implements MigrationInterface
{
  name = "AddCognitoIdentityColumns1775003000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cognitoUsername" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cognitoSub" character varying`
    );

    await queryRunner.query(
      `UPDATE "users"
       SET "cognitoUsername" = "email"
       WHERE "cognitoUsername" IS NULL`
    );

    await queryRunner.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'UQ_users_cognitoUsername'
         ) THEN
           ALTER TABLE "users"
           ADD CONSTRAINT "UQ_users_cognitoUsername" UNIQUE ("cognitoUsername");
         END IF;
       END $$;`
    );

    await queryRunner.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'UQ_users_cognitoSub'
         ) THEN
           ALTER TABLE "users"
           ADD CONSTRAINT "UQ_users_cognitoSub" UNIQUE ("cognitoSub");
         END IF;
       END $$;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_cognitoSub"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_cognitoUsername"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "cognitoSub"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "cognitoUsername"`
    );
  }
}
