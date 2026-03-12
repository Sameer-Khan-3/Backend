import {
  Entity,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Permission } from "./permission";
import { User } from "./User";

@Entity("roles")
export class Role extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: "role_permissions",
  })
  permissions: Permission[];

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
