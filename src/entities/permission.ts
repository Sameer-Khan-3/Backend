import { Entity, Column, ManyToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Role } from "./Role";
import { Entity, Column, ManyToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Role } from "./Role";

@Entity("permissions")
export class Permission extends BaseEntity {
export class Permission extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}