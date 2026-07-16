const fs = require("fs");
const path = require("path");
// const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const pdfParse = require("pdf-parse");
const client = new OpenAI({
  apiKey: process.env.GITHUB_TOKEN,
  baseURL: "https://models.github.ai/inference",
});

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const OPENAI_URL = 'https://models.github.ai/inference';
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function loadConfig(filename) {
  const candidates = [
    path.join(__dirname, "..", "..", "..", "configs", filename),
    path.join(process.cwd(), "configs", filename)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  }
  throw new Error(`Config file not found: ${filename}`);
}

// function getSupabase() {
//   const url = process.env.SUPABASE_URL;
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!url || !key) return null;
//   return createClient(url, key, { auth: { persistSession: false } });
// }

// Pools every user text input into a single clinical note
function buildClinicalNote(payload) {
  const p = payload.userProfile || {};
  const inj = payload.injuryProfile || {};
  const lines = [];

  lines.push("RUNVERVE SMARTHEAL - POOLED CLINICAL NOTE");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("=== USER PROFILE ===");
  lines.push(`Age: ${p.age || "not provided"}`);
  lines.push(`Sex: ${p.sex || "not provided"}`);
  lines.push(`Height (cm): ${p.height || "not provided"}`);
  lines.push(`Weight (kg): ${p.weight || "not provided"}`);
  lines.push(`Activity level: ${p.activityLevel || "not provided"}`);
  lines.push(`Known medical conditions: ${p.conditions || "none reported"}`);
  lines.push(`Implanted devices: ${p.implants || "none reported"}`);
  lines.push(`Current medications: ${p.medications || "none reported"}`);
  lines.push("");
  lines.push("=== INJURY PROFILE ===");
  lines.push(`Injury location: ${inj.location || "not provided"}`);
  lines.push(`Onset: ${inj.onset || "not provided"}`);
  lines.push(`Pain scale (0-10): ${inj.painScale != null ? inj.painScale : "not provided"}`);
  lines.push(`Injury description: ${inj.description || "not provided"}`);
  lines.push("");
  lines.push("=== UPLOADED DOCUMENT TEXT ===");
  const textDocs = (payload.textDocuments || []).filter(d => d && d.content);
  if (textDocs.length === 0) {
    lines.push("None.");
  } else {
    for (const doc of textDocs) {
      lines.push(`--- ${doc.name} ---`);
      lines.push(doc.content.slice(0, 20000));
      lines.push("");
    }
  }
  lines.push("");
  lines.push("=== ADDITIONAL NOTES ===");
  lines.push(payload.additionalNotes || "None.");
  lines.push("");

  const attachments = (payload.files || []).map(f => `${f.name} (${f.mimeType})`);
  lines.push("=== ATTACHED FILES (passed to the model directly) ===");
  lines.push(attachments.length ? attachments.join("\n") : "None.");

  return lines.join("\n");
}

async function callGPT({ systemPrompt, userText, files = [] }) {
  console.log("Has GITHUB_TOKEN:", !!process.env.GITHUB_TOKEN);
  console.log("Environment keys:", Object.keys(process.env).filter(k => k.includes("GITHUB") || k.includes("OPENAI")));
  const apiKey = process.env.GITHUB_TOKEN;
  if (!apiKey) throw new Error("GITHUB_TOKEN is not set");

  const content = [];

  // User prompt
  content.push({
    type: "text",
    text: userText
  });

  for (const f of files) {

    if (!f?.data || !f?.mimeType)
      continue;

    // ---------- Images ----------
    if (f.mimeType.startsWith("image/")) {

      content.push({
        type: "image_url",
        image_url: {
          url: `data:${f.mimeType};base64,${f.data}`
        }
      });

      continue;
    }

    // ---------- PDFs ----------
    if (f.mimeType === "application/pdf") {

      try {

        const buffer = Buffer.from(f.data, "base64");
        const parsed = await pdfParse(buffer);

        content.push({
          type: "text",
          text:
`===== PDF: ${f.name || "document"} =====

${parsed.text}

===== END PDF =====`
        });

      } catch (err) {

        content.push({
          type: "text",
          text:
`Unable to read PDF "${f.name || "document"}".`
        });

      }

      continue;
    }

    // ---------- Plain text ----------
    if (
      f.mimeType.startsWith("text/") ||
      f.mimeType === "application/json" ||
      f.mimeType === "text/csv"
    ) {

      try {

        const text = Buffer
          .from(f.data, "base64")
          .toString("utf8");

        content.push({
          type: "text",
          text:
`===== FILE: ${f.name || "text"} =====

${text}

===== END FILE =====`
        });

      } catch {}

      continue;
    }

    // ---------- Unknown file ----------
    content.push({
      type: "text",
      text:
`Attached file "${f.name || "unknown"}" (${f.mimeType}) could not be interpreted.`
    });

  }

  const response = await client.chat.completions.create({

    model: process.env.OPENAI_MODEL || "openai/gpt-4o",

    temperature: 0,

    response_format: {
      type: "json_object"
    },

    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content
      }
    ]

  });

  return parseJsonLoose(
    response.choices[0].message.content
  );

}

async function callGemini({ systemPrompt, userText, files = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const parts = [{ text: userText }];
  for (const f of files) {
    if (f && f.data && f.mimeType) {
      parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } });
    }
  }

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map(part => part.text || "")
    .join("");

  return parseJsonLoose(text);
}

function parseJsonLoose(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

// async function persistClinicalNote(sessionId, noteText) {
//   const supabase = getSupabase();
//   if (!supabase) return { stored: false, reason: "Supabase not configured" };
//   const bucket = process.env.SUPABASE_BUCKET || "smartheal";
//   const { error } = await supabase.storage
//     .from(bucket)
//     .upload(`configs/${sessionId}/clinical_note.txt`, Buffer.from(noteText, "utf-8"), {
//       contentType: "text/plain",
//       upsert: true
//     });
//   if (error) return { stored: false, reason: error.message };
//   return { stored: true, path: `configs/${sessionId}/clinical_note.txt` };
// }

// async function persistUploads(sessionId, files) {
//   const supabase = getSupabase();
//   if (!supabase || !files || files.length === 0) return;
//   const bucket = process.env.SUPABASE_BUCKET || "smartheal";
//   for (const f of files) {
//     try {
//       await supabase.storage
//         .from(bucket)
//         .upload(`uploads/${sessionId}/${sanitizeName(f.name)}`, Buffer.from(f.data, "base64"), {
//           contentType: f.mimeType,
//           upsert: true
//         });
//     } catch (e) {
//       console.error("Upload persist failed:", f.name, e.message);
//     }
//   }
// }

// async function upsertSession(sessionId, fields) {
//   const supabase = getSupabase();
//   if (!supabase) return;
//   const { error } = await supabase
//     .from("smartheal_sessions")
//     .upsert({ id: sessionId, ...fields }, { onConflict: "id" });
//   if (error) console.error("Session upsert failed:", error.message);
// }

function sanitizeName(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

module.exports = {
  loadConfig,
  buildClinicalNote,
  callGemini,
  callGPT,
  // persistClinicalNote,
  // persistUploads,
  // upsertSession,
  jsonResponse
};
