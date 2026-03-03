import {
  Entity,
  Column,
  ManyToMany,
  JoinTable,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Permission } from "./Permission";
import { User } from "./User";
import { BaseEntity } from "./base.entity";

export enum Roles {
  Employee = "Employee",
  Manager = "Manager",
  Admin = "Admin",
  SuperAdmin = "SuperAdmin",
}

@Entity("roles")
export class Role extends BaseEntity {

  @Column({
    type: "enum",
    enum: Roles,
    unique: true,
  })
  name: Roles;

  /**
   * Role hierarchy
   */
  @ManyToOne(() => Role, (role) => role.children, {
    nullable: true,
    onDelete: "SET NULL",
  })
  parent: Role | null;

  @OneToMany(() => Role, (role) => role.parent)
  children: Role[];

  /**
   * Role - Permission Mapping
   */
  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: "role_permissions",
    joinColumn: {
      name: "role_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "permission_id",
      referencedColumnName: "id",
    },
  })
  permissions: Permission[];

  /**
   * Role - User Mapping
   */
  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}