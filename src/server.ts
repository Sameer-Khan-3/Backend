import app from "./app";
import dotenv from "dotenv";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;

AppDataSource.initialize()
  .then(() => {
    app.listen(PORT);
  })
  .catch(() => undefined);
