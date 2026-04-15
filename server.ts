import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  app.use(express.json());

  // Udio API Proxy Endpoints
  const UDIO_API_BASE = "https://api.udioapi.pro/api/v1";

  app.post("/api/generate", async (req, res) => {
    try {
      const apiKey = process.env.UDIO_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "UDIO_API_KEY not configured" });
      }

      const response = await axios.post(`${UDIO_API_BASE}/generate`, req.body, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Udio Generate Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
  });

  app.get("/api/feed/:id", async (req, res) => {
    try {
      const apiKey = process.env.UDIO_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "UDIO_API_KEY not configured" });
      }

      const response = await axios.get(`${UDIO_API_BASE}/feed/${req.params.id}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Udio Feed Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

// For local development
if (process.env.NODE_ENV !== "production") {
  createServer().then(app => {
    app.listen(3000, "0.0.0.0", () => {
      console.log("Server running on http://localhost:3000");
    });
  });
}

// Export for Vercel
export default createServer();
