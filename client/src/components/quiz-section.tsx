import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizSectionProps {
  topic: string;
}

export default function QuizSection({ topic }: QuizSectionProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  const generateQuiz = async () => {
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      setQuestions(data);
      setSelectedAnswers(new Array(data.length).fill(-1));
      setShowResults(false);
    } catch (error) {
      console.error("Errore nella generazione del quiz:", error);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Quiz di Verifica
          <Button onClick={generateQuiz} variant="outline">
            Genera Nuovo Quiz
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Clicca il pulsante per generare un quiz su questo argomento
          </p>
        ) : (
          <div className="space-y-6">
            {questions.map((q, questionIndex) => (
              <div key={questionIndex} className="space-y-4">
                <p className="font-medium">{q.question}</p>
                <RadioGroup
                  value={selectedAnswers[questionIndex]?.toString()}
                  onValueChange={(value) => {
                    const newAnswers = [...selectedAnswers];
                    newAnswers[questionIndex] = parseInt(value);
                    setSelectedAnswers(newAnswers);
                  }}
                >
                  {q.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={optionIndex.toString()} id={`q${questionIndex}-a${optionIndex}`} />
                      <Label htmlFor={`q${questionIndex}-a${optionIndex}`}>
                        {option}
                        {showResults && (
                          <span className="ml-2">
                            {optionIndex === q.correctAnswer ? (
                              <Check className="inline h-4 w-4 text-green-500" />
                            ) : selectedAnswers[questionIndex] === optionIndex ? (
                              <X className="inline h-4 w-4 text-red-500" />
                            ) : null}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
            {!showResults && (
              <Button 
                className="w-full mt-4" 
                onClick={() => setShowResults(true)}
                disabled={selectedAnswers.includes(-1)}
              >
                Verifica Risposte
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
