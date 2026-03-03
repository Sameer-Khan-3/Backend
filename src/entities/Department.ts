import {
  Entity,
  Column,
  OneToMany,
} from "typeorm";
import { User } from "./User";
import { BaseEntity } from "./base.entity";

@Entity("departments")
export class Department extends BaseEntity {

  @Column({ unique: true })
  name: string;

  @OneToMany(() => User, (user) => user.department)
  users: User[];
}