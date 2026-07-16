const {
  loadConfig,
  buildClinicalNote,
  // callGemini,
  callGPT,
  // persistClinicalNote,
  // persistUploads,
  // upsertSession,
  jsonResponse
} = require("./lib/core");

const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, {});
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Use POST" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const sessionId = payload.sessionId || crypto.randomUUID();

  try {
    const systemPrompt = loadConfig("profile_agent_prompt.txt");
    const conditions = loadConfig("conditions.json");

    const clinicalNote = buildClinicalNote(payload);

    const userText = [
      "Known condition vocabulary (for reference when classifying):",
      conditions,
      "",
      "Clinical Note:",
      clinicalNote
    ].join("\n");

    // PDFs and images go to LLM directly as inline data
    const files = (payload.files || []).filter(f =>
      f && f.data && /^(application\/pdf|image\/(png|jpe?g|webp))$/.test(f.mimeType)
    );

    const profile = await callGPT({ systemPrompt, userText, files });

    // // Persist in the background of the response, tolerating failures
    // const noteResult = await persistClinicalNote(sessionId, clinicalNote);
    // await persistUploads(sessionId, files);
    // await upsertSession(sessionId, {
    //   clinical_note: clinicalNote,
    //   user_inputs: {
    //     userProfile: payload.userProfile || null,
    //     injuryProfile: payload.injuryProfile || null,
    //     additionalNotes: payload.additionalNotes || null
    //   },
    //   profile_result: profile
    // });

    return jsonResponse(200, {
      sessionId,
      profile,
      // clinicalNoteStored: noteResult
    });
  } catch (e) {
    console.error(e);
    return jsonResponse(500, { error: e.message, sessionId });
  }
};
