import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPostSchema } from "@shared/schema";

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState("");

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const tags = hashtags
        .split(" ")
        .map(t => t.trim())
        .filter(t => t.startsWith("#"))
        .map(t => t.slice(1));

      const post = insertPostSchema.parse({
        content,
        hashtags: tags
      });

      await apiRequest("POST", "/api/posts", post);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setContent("");
      setHashtags("");
    }
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <Textarea
          placeholder="Condividi i tuoi progressi nello studio..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
        />
        <Input
          placeholder="Aggiungi hashtag (es. #matematica #studio)"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          className="mt-4"
        />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={() => createPostMutation.mutate()}
          disabled={!content.trim()}
        >
          Pubblica
        </Button>
      </CardFooter>
    </Card>
  );
}
