import { NextRequest, NextResponse } from "next/server";

const FALLBACK_SKILL_KEYWORDS: Record<string, string[]> = {
  frontend: ["ui", "frontend", "react", "angular", "vue", "css", "design system"],
  backend: ["backend", "api", "server", "node", "express", "django"],
  database: ["database", "sql", "mongodb", "postgres", "data model"],
  design: ["ui/ux", "design", "figma", "mockup", "prototype"],
  ml: ["machine learning", "ml", "ai", "model", "nlp", "prediction"],
  devops: ["deploy", "docker", "ci/cd", "devops", "cloud", "aws"],
};

// Simple keyword fallback used when no ANTHROPIC_API_KEY is set, so this
// still works out of the box without an API cost.
function fallbackExtract(description: string): string[] {
  const lower = description.toLowerCase();
  const found = Object.entries(FALLBACK_SKILL_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => lower.includes(k)))
    .map(([skill]) => skill);
  return found.length ? found : ["frontend", "backend"];
}

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    if (!description || description.trim().length < 10) {
      return NextResponse.json({ error: "Provide a longer project description first." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ skills: fallbackExtract(description), method: "keyword-fallback" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content:
              `Read this student project description and return ONLY a JSON array (no prose, no markdown fences) ` +
              `of 2-6 short lowercase skill tags needed for it, from this style of vocabulary: frontend, backend, ` +
              `database, design, ml, devops, mobile, testing, security, cloud. Description:\n\n"${description}"`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    let skills: string[];
    try {
      skills = JSON.parse(text.trim());
      if (!Array.isArray(skills)) throw new Error("not an array");
    } catch {
      skills = fallbackExtract(description);
    }

    return NextResponse.json({ skills, method: "ai" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Skill extraction failed" }, { status: 500 });
  }
}
