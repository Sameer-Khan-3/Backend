import { MigrationInterface, QueryRunner } from "typeorm";

export class SwitchUserToSingleRole1774000000000
  implements MigrationInterface
{
  name = "SwitchUserToSingleRole1774000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" uuid`
    );

    await queryRunner.query(
      `UPDATE "users" u
       SET "roleId" = ur."rolesId"
       FROM "user_roles" ur
       WHERE ur."usersId" = u.id AND u."roleId" IS NULL`
    );

    await queryRunner.query(
      `UPDATE "users" u
       SET "roleId" = ur."role_id"
       FROM "user_roles" ur
       WHERE ur."user_id" = u.id AND u."roleId" IS NULL`
    );

    await queryRunner.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_roleId'
         ) THEN
           ALTER TABLE "users"
           ADD CONSTRAINT "FK_users_roleId"
           FOREIGN KEY ("roleId")
           REFERENCES "roles"("id")
           ON DELETE SET NULL
           ON UPDATE NO ACTION;
         END IF;
       END $$;`
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_roles" (
        "usersId" uuid NOT NULL,
        "rolesId" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("usersId", "rolesId")
      )`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_roles_usersId" ON "user_roles" ("usersId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_roles_rolesId" ON "user_roles" ("rolesId")`
    );

    await queryRunner.query(
      `ALTER TABLE "user_roles"
       ADD CONSTRAINT "FK_user_roles_usersId"
       FOREIGN KEY ("usersId") REFERENCES "users"("id")
       ON DELETE CASCADE ON UPDATE CASCADE`
    );

    await queryRunner.query(
      `ALTER TABLE "user_roles"
       ADD CONSTRAINT "FK_user_roles_rolesId"
       FOREIGN KEY ("rolesId") REFERENCES "roles"("id")
       ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `INSERT INTO "user_roles" ("usersId", "rolesId")
       SELECT "id", "roleId" FROM "users"
       WHERE "roleId" IS NOT NULL
       ON CONFLICT DO NOTHING`
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_roleId"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "roleId"`
    );
  }
}
