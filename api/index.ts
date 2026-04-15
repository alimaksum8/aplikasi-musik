import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Update ke Suno API Base URL
const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";

// Endpoint Generate
app.post("/api/generate", async (req, res) => {
  const apiKey = process.env.SUNO_API_KEY || process.env.UDIO_API_KEY; // Mendukung kedua nama env
  
  if (!apiKey || apiKey === "YOUR_API_KEY") {
    return res.status(500).json({ error: "API Key Suno belum dikonfigurasi di Vercel (SUNO_API_KEY)." });
  }

  try {
    console.log("Starting Suno generation...");
    
    const response = await axios.post(`${SUNO_API_BASE}/generate`, req.body, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 25000,
    });

    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: error.message };
    console.error(`Suno API Error (${status}):`, JSON.stringify(errorData));
    return res.status(status).json(errorData);
  }
});

// Endpoint Feed/Status
app.get("/api/feed/:id", async (req, res) => {
  const apiKey = process.env.SUNO_API_KEY || process.env.UDIO_API_KEY;
  
  try {
    const response = await axios.get(`${SUNO_API_BASE}/feed/${req.params.id}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

export default app;
