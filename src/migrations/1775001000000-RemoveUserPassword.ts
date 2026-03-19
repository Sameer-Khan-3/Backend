import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUserPassword1775001000000 implements MigrationInterface {
  name = "RemoveUserPassword1775001000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "password"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" character varying`
    );
  }
}
