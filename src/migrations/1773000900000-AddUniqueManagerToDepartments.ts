import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueManagerToDepartments1773000900000
  implements MigrationInterface
{
  name = "AddUniqueManagerToDepartments1773000900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_departments_managerId" ON "departments" ("managerId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_departments_managerId"`
    );
  }
}
