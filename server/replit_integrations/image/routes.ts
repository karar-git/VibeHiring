import type { Express, Request, Response } from "express";

// Python AI service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size = "1024x1024", model = "dall-e-3", quality = "standard" } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Call Python AI service for image generation
      const aiResponse = await fetch(`${AI_SERVICE_URL}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size, model, quality })
      });

      if (!aiResponse.ok) {
        throw new Error(`AI service error: ${aiResponse.status}`);
      }

      const result = await aiResponse.json() as { image: string; format: string };
      
      res.json({
        b64_json: result.image,
        format: result.format
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}
