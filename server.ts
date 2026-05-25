import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, socialLinks } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an AI assistant for Dubai Store. 
        When users ask about social media or contact, refer them to these links: ${JSON.stringify(socialLinks)}. 
        Always be helpful and keep the tone professional but warm.
        Current user message: ${message}`,
      });
      res.json({ reply: response.text });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to chat" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
