// Parses extracted resume text + structural hints into normalized ResumeData
// using Lovable AI (Gemini). Returns { resume, layout } where `layout`
// captures section order and heading/style hints inferred from the upload.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function stripFences(s: string): string {
  return s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { rawText, hints } = await req.json();
    if (!rawText || typeof rawText !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing rawText" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const prompt = `You are a resume parser. Convert the raw extracted text of a candidate's resume into a strict JSON object that matches our schema.

You will also receive STRUCTURAL HINTS detected from the original file (likely section headings, bullet character, columns, font sizes). Use those to infer the original LAYOUT.

Return ONLY a raw JSON object (no markdown fences, no commentary) with EXACTLY this shape:

{
  "resume": {
    "name": string,
    "contact": {
      "location": string,
      "phone": string,
      "email": string,
      "linkedin": string,   // domain/path only, no https://
      "github": string      // domain/path only, no https://
    },
    "summary": string,
    "skills": string[],
    "experience": [
      { "role": string, "company": string, "duration": string, "bullets": string[] }
    ],
    "projects": [
      { "name": string, "bullets": string[] }
    ],
    "education": [
      { "institution": string, "degree": string, "duration": string, "gpa"?: string }
    ],
    "additionalSkills": [
      { "title": string, "description": string }
    ]
  },
  "layout": {
    "sectionOrder": string[],            // e.g. ["summary","skills","experience","projects","education","additionalSkills"] — actual order found in the upload
    "headingStyle": "uppercase" | "title" | "smallcaps",
    "headingUnderline": boolean,
    "accentColor": string,               // best-guess hex (default "#000000" if unsure)
    "fontFamily": "serif" | "sans",
    "columns": 1 | 2,
    "bulletChar": string                 // single character, e.g. "•", "-", "▪"
  }
}

RULES:
- NEVER fabricate experience, companies, dates, projects, or numbers.
- If a field is missing in the source, return an empty string or empty array.
- If the resume has sections we don't model (Awards, Certifications, Publications, etc.), put each as an entry in additionalSkills with the section name in "title" and the contents joined into "description".
- Preserve original wording in bullets.
- "linkedin" and "github" should be the URL minus the scheme (e.g. "linkedin.com/in/jdoe").
- sectionOrder must reflect the order the sections actually appear in the upload.

STRUCTURAL HINTS:
${JSON.stringify(hints, null, 2)}

RAW RESUME TEXT:
${rawText}`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "user", content: prompt }],
        }),
      },
    );

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again shortly.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add credits in workspace settings.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    let parsed;
    try {
      parsed = JSON.parse(stripFences(content));
    } catch (e) {
      console.error("JSON parse failed", content);
      return new Response(JSON.stringify({ error: "AI returned invalid JSON" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
