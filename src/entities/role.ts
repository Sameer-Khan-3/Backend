import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Permission } from "./Permission";
import { User } from "./User";

enum Roles {
  Employee,
  Manager,
  Admin,
  SuperAdmin,
}
@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  /**
   * Manager → parent = Admin
   * Employee → parent = Manager
   */
  @ManyToOne(() => Role, (role) => role.children, {
    nullable: true,
    onDelete: "SET NULL",
  })
  parent: Role | null;

  @OneToMany(() => Role, (role) => role.parent)
  children: Role[];

  /**
   *Role - Permission Mapping
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