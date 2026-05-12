import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const DEFAULT_ORDER = ['groq', 'gemini', 'openai'];

const sanitizeJson = (content) => {
  if (!content) return null;
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  return cleaned;
};

const callGroq = async (prompt) => {
  if (!GROQ_API_KEY) return null;
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const content = response.data.choices?.[0]?.message?.content;
  return content ? JSON.parse(content) : null;
};

const callOpenAI = async (prompt) => {
  if (!OPENAI_API_KEY) return null;
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const content = response.data.choices?.[0]?.message?.content;
  return content ? JSON.parse(content) : null;
};

const callGemini = async (prompt) => {
  if (!GEMINI_API_KEY) return null;
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
    },
    { timeout: 45000 }
  );

  let content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return null;
  const cleaned = sanitizeJson(content);
  return cleaned ? JSON.parse(cleaned) : null;
};

export const generateJson = async ({ prompt, providerOrder }) => {
  const order = providerOrder && providerOrder.length > 0 ? providerOrder : DEFAULT_ORDER;
  let lastError = null;

  for (const provider of order) {
    try {
      if (provider === 'groq') {
        const result = await callGroq(prompt);
        if (result) return { provider, result };
      }
      if (provider === 'gemini') {
        const result = await callGemini(prompt);
        if (result) return { provider, result };
      }
      if (provider === 'openai') {
        const result = await callOpenAI(prompt);
        if (result) return { provider, result };
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
};
