import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMustChangePassword1772525275377 implements MigrationInterface {
    name = 'AddMustChangePassword1772525275377'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "mustChangePassword" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "mustChangePassword"`);
    }

}
