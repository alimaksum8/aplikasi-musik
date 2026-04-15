import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const UDIO_API_BASE = "https://api.udioapi.pro/api/v1";

// Endpoint Generate
app.post("/api/generate", async (req, res) => {
  const apiKey = process.env.UDIO_API_KEY;
  
  if (!apiKey || apiKey === "YOUR_UDIO_API_KEY") {
    console.error("UDIO_API_KEY is not set or is still the placeholder.");
    return res.status(500).json({ error: "API Key Udio belum dikonfigurasi di Vercel." });
  }

  try {
    console.log("Starting Udio generation with payload:", JSON.stringify(req.body));
    
    const response = await axios.post(`${UDIO_API_BASE}/generate`, req.body, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 25000, // Tambahkan timeout agar tidak menggantung
    });

    console.log("Udio API Success:", response.data);
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: error.message };
    
    console.error(`Udio API Error (${status}):`, JSON.stringify(errorData));
    
    // Pastikan kita selalu mengembalikan JSON
    return res.status(status).json(errorData);
  }
});

// Endpoint Feed/Status
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

export default app;
