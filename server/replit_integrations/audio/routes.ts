import express, { type Express, type Request, type Response } from "express";
import { chatStorage } from "../chat/storage";
import FormData from "form-data";

// Python AI service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

// Body parser with 50MB limit for audio payloads
const audioBodyParser = express.json({ limit: "50mb" });

export function registerAudioRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send voice message and get streaming audio response
  // Uses Python AI service for speech-to-text and voice chat
  app.post("/api/conversations/:id/messages", audioBodyParser, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { audio, voice = "alloy" } = req.body;

      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      // 1. Call Python AI service for speech-to-text
      const sttResponse = await fetch(`${AI_SERVICE_URL}/api/speech-to-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio, format: "wav" })
      });

      if (!sttResponse.ok) {
        throw new Error(`STT service error: ${sttResponse.status}`);
      }

      const sttResult = await sttResponse.json() as { text: string };
      const userTranscript = sttResult.text;

      // 2. Save user message
      await chatStorage.createMessage(conversationId, "user", userTranscript);

      // 3. Get conversation history
      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const chatHistory = existingMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // 4. Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ type: "user_transcript", data: userTranscript })}\n\n`);

      // 5. Get chat response from Python AI service
      const chatResponse = await fetch(`${AI_SERVICE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          max_tokens: 2048
        })
      });

      if (!chatResponse.ok) {
        throw new Error(`Chat service error: ${chatResponse.status}`);
      }

      const chatResult = await chatResponse.json() as { response: string };
      const assistantTranscript = chatResult.response;

      res.write(`data: ${JSON.stringify({ type: "transcript", data: assistantTranscript })}\n\n`);

      // 6. Convert response to speech via Python AI service
      const ttsResponse = await fetch(`${AI_SERVICE_URL}/api/text-to-speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: assistantTranscript,
          voice,
          format: "mp3"
        })
      });

      if (!ttsResponse.ok) {
        throw new Error(`TTS service error: ${ttsResponse.status}`);
      }

      const ttsResult = await ttsResponse.json() as { audio: string };
      res.write(`data: ${JSON.stringify({ type: "audio", data: ttsResult.audio })}\n\n`);

      // 7. Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", assistantTranscript);

      res.write(`data: ${JSON.stringify({ type: "done", transcript: assistantTranscript })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error processing voice message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to process voice message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process voice message" });
      }
    }
  });
}
