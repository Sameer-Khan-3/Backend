import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";


@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  username!: string;

  @Column({select: false})
  password!: string;
  
  @Column()
  role!: string;

  @Column({ nullable: true})
  resetToken!: string;

  @Column({ type: "timestamp", nullable: true})
  resetTokenExpiry!: Date;

  @Column({ nullable: true })
  resetToken: string;

  @Column({type: "timestamp", nullable: true})
  resetTokenExpiry: Date;
}