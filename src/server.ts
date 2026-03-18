import app from "./app";
import dotenv from "dotenv";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const serverUrl = process.env.SERVER_URL;
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(
        serverUrl
          ? `Server running on ${serverUrl}`
          : `Server running on port ${PORT}`
      );
    });
  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
  });
