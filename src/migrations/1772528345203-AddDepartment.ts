import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDepartment1772528345203 implements MigrationInterface {
    name = 'AddDepartment1772528345203'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_554d853741f2083faaa5794d2ae"`);
        await queryRunner.query(`CREATE TABLE "department" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "managerId" uuid, CONSTRAINT "UQ_471da4b90e96c1ebe0af221e07b" UNIQUE ("name"), CONSTRAINT "PK_9a2213262c1593bffb581e382f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "departmentId"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "departmentId" integer`);
        await queryRunner.query(`ALTER TABLE "department" ADD CONSTRAINT "FK_2147eb9946aa96094b7f78b1954" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_554d853741f2083faaa5794d2ae" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_554d853741f2083faaa5794d2ae"`);
        await queryRunner.query(`ALTER TABLE "department" DROP CONSTRAINT "FK_2147eb9946aa96094b7f78b1954"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "departmentId"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "departmentId" uuid`);
        await queryRunner.query(`DROP TABLE "department"`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_554d853741f2083faaa5794d2ae" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
