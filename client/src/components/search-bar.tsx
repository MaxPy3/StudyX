import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchContent, type StudyContent } from "@/lib/gemini";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QuizSection from "./quiz-section";
import ConceptMap from "./concept-map";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: results, isLoading, isError, error } = useQuery<StudyContent[]>({
    queryKey: ["/api/search-content", debouncedQuery],
    queryFn: () => searchContent(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    retry: 1, // Only retry once to prevent too many failed requests
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(query);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="search"
          placeholder="Cerca argomenti di studio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {isLoading && (
        <div className="mt-4 text-center text-muted-foreground">
          Ricerca in corso...
        </div>
      )}
      
      {isError && (
        <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md text-red-600">
          <p className="font-medium">Errore nella ricerca</p>
          <p className="text-sm mt-1">
            Si è verificato un problema con l'API Gemini. Potrebbe essere necessario aggiornare la chiave API.
          </p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-4 space-y-4">
          {results.map((result, index) => (
            <div key={index}>
              <Card>
                <CardHeader>
                  <CardTitle>{result.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-sm max-w-none" 
                    dangerouslySetInnerHTML={{ __html: result.content }}
                  />
                </CardContent>
              </Card>

              <QuizSection topic={result.title} />
              <ConceptMap topic={result.title} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}