import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./config/db";
import colors from "colors";

// Enable colors for console output
colors.enable();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...".red.bold);
  console.log(err.name, err.message);
  process.exit(1);
});

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();
    console.log("Database connected successfully".green.bold);

    // Start server
    const server = app.listen(PORT, () => {
      console.log(
        `Server running in ${NODE_ENV} mode on port ${PORT}`.yellow.bold
      );
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err: Error) => {
      console.log("UNHANDLED REJECTION! 💥 Shutting down...".red.bold);
      console.log(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`.yellow);
      server.close(() => {
        console.log("Server closed. Exiting process...".green);
        process.exit(0);
      });
    };

    // Listen for shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:".red.bold, error);
    process.exit(1);
  }
};

// Start the server
startServer().catch((error) => {
  console.error("Error starting server:".red.bold, error);
  process.exit(1);
});
