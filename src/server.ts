import app from "./app";
import dotenv from "dotenv";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";

dotenv.config();

const PORT = 4000;
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
  });
