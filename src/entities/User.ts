import {
  Entity,
  Column,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
} from "typeorm";
import { Role } from "./Role";
import { Department } from "./Department";
import { BaseEntity } from "./base.entity";

@Entity("users")
export class User extends BaseEntity {

  @Column()
  username: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  resetToken: string;

  @Column({ type: "timestamptz", nullable: true })
  resetTokenExpiry: Date;

  /**
   * User - Department
   */
  @ManyToOne(() => Department, (department) => department.users, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "department_id" })
  department: Department;

  /**
   * User - Role
   */
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: "user_roles",
    joinColumn: {
      name: "user_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "role_id",
      referencedColumnName: "id",
    },
  })
  roles: Role[];
}