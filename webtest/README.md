# SmartHeal Intake

Runverve branded web app that takes a user's profile, injury details, and medical records, pools every text input into a single clinical note, and runs a two-agent pipeline to produce a therapy recommendation.

The strategy stage is open ended. It first decides whether therapy is recommended at all. If yes, it recommends the clinically best therapies without restriction. Any therapy that falls under SmartHeal's three modes (Heating, Electrotherapy, Vibration) becomes a SmartHeal protocol with exact device parameters. Everything else becomes equipment guidance for the user.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Static HTML/CSS/JS on Netlify |
| Backend | Netlify Functions (Node) |
| LLM | GCP Gemini (gemini-2.5-flash by default) |
| Storage and DB | Supabase (Storage bucket + Postgres table) |

## How inputs flow

1. User fills the intake: profile (age, sex, height, weight, activity, conditions, implants, medications), injury (location, onset, pain scale, description, optional photo), records (PDFs, images, .txt), and free notes.
2. The frontend reads .txt files client side. PDFs and images are base64 encoded.
3. `analyze-profile` pools all text inputs into `clinical_note.txt` (same structure the Python pipeline used), saves it to Supabase Storage at `configs/{session_id}/clinical_note.txt`, uploads the raw files to `uploads/{session_id}/`, and sends the note plus PDFs and images to Gemini with the profile agent prompt. Gemini reads PDFs and images natively, so no OCR step is needed.
4. `analyze-strategy` sends the extracted profile to Gemini with the open ended strategy prompt and stores the result on the session row.
5. The frontend renders the verdict, SmartHeal protocol, therapy list, equipment guidance, and the raw extracted profile.

## Setup

### 1. Supabase

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor. It creates the `smartheal_sessions` table and a private `smartheal` storage bucket.
3. Copy the project URL and the service role key (Settings > API).

### 2. Gemini

Create an API key in Google AI Studio or use a GCP project with the Generative Language API enabled.

### 3. Netlify

1. Push this repo to GitHub and import it in Netlify, or run `netlify deploy` from the CLI.
2. Set environment variables in Site settings > Environment variables:
   - `GEMINI_API_KEY` (required)
   - `GEMINI_MODEL` (optional, defaults to gemini-2.5-flash)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` (optional; without them the app still works, it just skips persistence)
3. Deploy. The build settings are in `netlify.toml` (publish `public`, functions in `netlify/functions`, configs bundled with the functions).

### Local development

```
npm install
cp .env.example .env   # fill in keys
npx netlify dev
```

## Repo layout

```
configs/
  clinical_note.txt            Reference template for the pooled note
  profile_agent_prompt.txt     Profile extraction prompt
  strategy_agent_prompt.txt    Open ended strategy prompt with SmartHeal gating
  conditions.json              Condition vocabulary (from the Python repo)
  modalities.json              Device modality reference (from the Python repo)
netlify/functions/
  analyze-profile.js           Pools clinical note, runs profile agent, persists
  analyze-strategy.js          Runs strategy agent, persists
  lib/core.js                  Gemini, Supabase, and note pooling helpers
public/
  index.html, styles.css, app.js
supabase/schema.sql
```

## Notes

- Total upload size is capped at 4 MB per analysis because Netlify function payloads are limited to 6 MB.
- Wearable and sensor data streams are intentionally out of scope for now.
- This is decision support, not a medical device output. The UI carries a disclaimer and the strategy agent refuses to recommend therapy when red flags call for clinician review.
