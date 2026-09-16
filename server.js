import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({ error: "Message खाली है।" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message
    });

    res.json({
      success: true,
      reply: response.text || ""
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "AI request failed",
      details: error.message
    });
  }
});

app.post("/api/edit-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "पहले फोटो upload करें।" });
    }

    const prompt = String(req.body.prompt || "").trim();

    if (!prompt) {
      return res.status(400).json({
        error: "Photo में क्या बदलाव करना है, वह लिखें।"
      });
    }

    const base64Image = req.file.buffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          text: prompt
        },
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: base64Image
          }
        }
      ]
    });

    let imageData = null;
    let mimeType = "image/png";

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/png";
        break;
      }
    }

    if (!imageData) {
      return res.status(500).json({
        error: "AI ने image result नहीं दिया।"
      });
    }

    res.json({
      success: true,
      image: imageData,
      mimeType
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Image editing failed",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
