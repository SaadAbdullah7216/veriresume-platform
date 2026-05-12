import "dotenv/config";
import { generateJson } from "./services/aiService.js";

async function test() {
  try {
    const res = await generateJson({ prompt: "Say hi in JSON: {\"message\": \"hi\"}", providerOrder: ["gemini"] });
    console.log("Gemini Success:", res);
  } catch (e) {
    console.error("Gemini Error:", e.message);
  }
  try {
    const res = await generateJson({ prompt: "Say hi in JSON: {\"message\": \"hi\"}", providerOrder: ["groq"] });
    console.log("Groq Success:", res);
  } catch (e) {
    console.error("Groq Error:", e.message);
  }
}

test();
