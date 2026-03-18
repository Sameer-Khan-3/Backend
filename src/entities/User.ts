import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Department } from "./Department";
import { Role } from "./role";

@Entity("users")
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Department, (department) => department.employees, {
    nullable: true,
  })
  department: Department | null;

  @Column({ nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Role, (role) => role.users, { nullable: true })
  @JoinColumn({ name: "roleId" })
  role: Role | null;

  @Column({ nullable: true })
  roleId: string | null;
}
