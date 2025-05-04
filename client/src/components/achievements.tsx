
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Heart, BookOpen, MessageSquare, Target } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Achievement {
  id: string;
  icon: JSX.Element;
  name: string;
  description: string;
  unlocked: boolean;
}

export function Achievements() {
  const [achievements] = useState<Achievement[]>([
    {
      id: 'first_post',
      icon: <Trophy className="h-4 w-4" />,
      name: 'Primo Post',
      description: 'Hai creato il tuo primo post',
      unlocked: true
    },
    {
      id: 'popular_post',
      icon: <Star className="h-4 w-4" />,
      name: 'Post Popolare',
      description: 'Hai ricevuto 10 mi piace su un post',
      unlocked: false
    },
    {
      id: 'engagement',
      icon: <Heart className="h-4 w-4" />,
      name: 'Impegnato',
      description: 'Hai messo mi piace a 5 post',
      unlocked: true
    },
    {
      id: 'scholar',
      icon: <BookOpen className="h-4 w-4" />,
      name: 'Studioso',
      description: 'Hai creato 5 post di studio',
      unlocked: false
    },
    {
      id: 'social',
      icon: <MessageSquare className="h-4 w-4" />,
      name: 'Sociale',
      description: 'Hai interagito con il tutor AI 3 volte',
      unlocked: false
    }
  ]);

  return (
    <div className="flex gap-2">
      <TooltipProvider>
        {achievements.map((achievement) => (
          <Tooltip key={achievement.id}>
            <TooltipTrigger>
              <Badge variant={achievement.unlocked ? "default" : "secondary"} className="cursor-help">
                {achievement.icon}
                <span className="ml-1">{achievement.name}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{achievement.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
