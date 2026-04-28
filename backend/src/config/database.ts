import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Production / managed hosts (Railway, Render, Fly, Heroku) hand us a single
// DATABASE_URL. Local dev uses the individual DB_* variables from .env.
export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: isProduction ? false : console.log,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
    })
  : new Sequelize(
      process.env.DB_NAME || "digital_will_db",
      process.env.DB_USER || "postgres",
      process.env.DB_PASSWORD || "digital_will_secure_pass_123",
      {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5433"),
        dialect: "postgres",
        logging: isProduction ? false : console.log,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      },
    );
