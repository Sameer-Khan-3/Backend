import {
  Entity,
  PrimaryGeneratedColumn,
  Column
} from "typeorm";

@Entity()
export class Permission {

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  module: string;   // e.g. "user"

  @Column()
  action: string;   // e.g. "create"
}