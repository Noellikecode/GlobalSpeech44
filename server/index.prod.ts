import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { registerRoutes } from "./routes.js";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Session configuration for production
const PgSession = ConnectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
    }),
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Serve static files from public directory
app.use(express.static(join(__dirname, "public")));

// Setup API routes
await registerRoutes(app);

// Serve React app for all other routes
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  if (process.env.DATABASE_URL) {
    console.log("✅ Database connection configured");
  } else {
    console.warn("⚠️ DATABASE_URL not set");
  }
});