import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany
} from "typeorm";
import { Permission } from "./permission";

@Entity()
export class Role {

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Permission)
  permissions: Permission[];
}