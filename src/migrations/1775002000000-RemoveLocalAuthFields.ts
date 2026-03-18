import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveLocalAuthFields1775002000000
  implements MigrationInterface
{
  name = "RemoveLocalAuthFields1775002000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "mustChangePassword"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "resetToken"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "resetTokenExpiry"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetToken" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP`
    );
  }
}
