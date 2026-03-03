import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from "typeorm";
import { Role } from "./Role";
import { BaseEntity } from "./base.entity";

@Entity("permissions")
export class Permission extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}