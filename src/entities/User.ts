import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Department } from "./Department";
import { Role } from "./Role";

@Entity("users")
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;
import { BaseEntity } from "./base.entity";
import { Department } from "./Department";
import { Role } from "./Role";

@Entity("users")
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;
  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  mustChangePassword: boolean;

  @Column({ nullable: true })
  resetToken: string | null;
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  mustChangePassword: boolean;

  @Column({ nullable: true })
  resetToken: string | null;

  @Column({ type: "timestamp", nullable: true })
  resetTokenExpiry: Date | null;
  @Column({ type: "timestamp", nullable: true })
  resetTokenExpiry: Date | null;

  // Each user belongs to one department
  @ManyToOne(() => Department, (department) => department.employees, {
    nullable: true,
  // Each user belongs to one department
  @ManyToOne(() => Department, (department) => department.employees, {
    nullable: true,
  })
  department: Department;
  department: Department;

  @Column({ nullable: true })
  departmentId: string;

  // Multiple roles
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: "user_roles",
  @Column({ nullable: true })
  departmentId: string;

  // Multiple roles
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: "user_roles",
  })
  roles: Role[];
  roles: Role[];
}