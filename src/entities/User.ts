import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Role } from "./role";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "varchar",
    length: 150,
    unique: true,
  })
  email!: string;

  @Column({
    type: "varchar",
    length: 255,
  })
  password!: string;

  @Column({
    type: "boolean",
    default: true,
  })
  isActive!: boolean;

  // 🔥 RBAC Relation
  @ManyToMany(() => Role, (role) => role.users, {
    eager: true,
  })
  @JoinTable({
    name: "user_roles",
  })
  roles!: Role[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
