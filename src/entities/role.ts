import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { User } from "./User";
import { Permission } from "./permission";

@Entity({ name: "roles" })
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  // Users relation
  @ManyToMany(() => User, (user) => user.roles)
  users!: User[];

  // Permissions relation
  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({
    name: "role_permissions",
  })
  permissions!: Permission[];
}
