const {
  loadConfig,
  // callGemini,
  callGPT,
  // upsertSession,
  jsonResponse
} = require("./lib/core");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, {});
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Use POST" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { sessionId, profile } = payload;
  if (!profile) return jsonResponse(400, { error: "Missing profile in body" });

  try {
    const systemPrompt = loadConfig("strategy_agent_prompt.txt");

    const userText = [
      "PATIENT PROFILE:",
      JSON.stringify(profile, null, 2)
    ].join("\n");

    const strategy = await callGPT({ systemPrompt, userText });

    // if (sessionId) {
    //   await upsertSession(sessionId, { strategy_result: strategy });
    // }

    return jsonResponse(200, { sessionId, strategy });
  } catch (e) {
    console.error(e);
    return jsonResponse(500, { error: e.message, sessionId });
  }
};
