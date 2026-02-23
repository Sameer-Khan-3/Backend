import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity()
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  // 🔥 One department has many employees
  @OneToMany(() => User, (user) => user.department)
  employees: User[];

  // 🔥 One department has one manager
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "managerId" })
  manager: User;
}