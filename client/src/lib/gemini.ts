import { z } from "zod";

const contentSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export type StudyContent = z.infer<typeof contentSchema>;

export async function generateContent(prompt: string): Promise<StudyContent> {
  const res = await fetch("/api/generate-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error("Failed to generate content");
  }

  return contentSchema.parse(await res.json());
}

export async function searchContent(query: string): Promise<StudyContent[]> {
  console.log("Searching for content with query:", query);
  const res = await fetch(`/api/search-content?q=${encodeURIComponent(query)}`);

  if (!res.ok) {
    console.error("Search request failed with status:", res.status);
    throw new Error("Failed to search content");
  }

  try {
    const data = await res.json();
    console.log("Search response data:", data);
    return z.array(contentSchema).parse(data);
  } catch (error) {
    console.error("Error parsing search results:", error);
    throw error;
  }
}