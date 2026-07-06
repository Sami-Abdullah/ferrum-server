import { groq } from '../lib/groq.js';

const SYSTEM_PROMPT = `You are the Atelier Guide — a knowledgeable, refined style consultant for Ferrum, a luxury architectural fashion brand.

Ferrum's aesthetic is minimalist, structural, and monochrome — think boxy overcoats, precision tailoring, and materials like virgin wool, cashmere, and horn buttons.

Guide customers on silhouettes, fabrics, sizing, and styling. Keep responses concise (2-4 sentences), elegant in tone, and never overly salesy. If asked about something outside fashion/Ferrum, politely redirect to how you can help with their wardrobe.`;

// -----------------------------------------------
// POST /api/chat
// Public — guests and signed-in users can both chat
// Body: { messages: [{ role, content }, ...] }
// -----------------------------------------------
export const sendChatMessage = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required',
      });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = completion.choices[0]?.message?.content || "I'm not sure how to respond to that.";

    res.status(200).json({
      success: true,
      reply,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};