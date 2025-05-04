import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Trash2 } from "lucide-react";
import { Post, User } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useCurrentUser } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PostCardProps {
  post: Post & { user: User };
}

interface LikesResponse {
  count: number;
  hasLiked: boolean;
  userIds: number[];
}

export default function PostCard({ post }: PostCardProps) {
  const { toast } = useToast();
  const [isLiking, setIsLiking] = useState(false);
  
  const { data: likesData } = useQuery<LikesResponse>({
    queryKey: [`/api/posts/${post.id}/likes`]
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      setIsLiking(true);
      try {
        await apiRequest("POST", `/api/posts/${post.id}/like`);
      } catch (error) {
        if (error instanceof Response && error.status === 409) {
          toast({
            title: "Mi piace già aggiunto",
            description: "Hai già messo mi piace a questo post",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } finally {
        setIsLiking(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/likes`] });
    },
    onError: (error) => {
      if (!(error instanceof Response && error.status === 409)) {
        toast({
          title: "Errore",
          description: "Impossibile aggiungere il mi piace",
          variant: "destructive",
        });
      }
    }
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/posts/${post.id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/likes`] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  });

  const { user } = useCurrentUser();
  const isLiked = likesData?.hasLiked ?? false;
  const likesCount = likesData?.count ?? 0;
  const postDate = post.createdAt ? new Date(post.createdAt) : new Date();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Link href={`/profile/${post.user.id}`}>
          <Avatar className="cursor-pointer">
            <AvatarFallback>
              {post.user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${post.user.id}`}>
              <span className="font-semibold hover:underline cursor-pointer">
                {post.user.username}
              </span>
            </Link>
            {post.user.username === "Max" && post.user.role === "owner" && (
              <span className="px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded">Owner</span>
            )}
            {post.isSuspicious && (
              <span className="px-2 py-1 text-xs font-semibold text-red-500 border border-red-500 rounded">Sospetto</span>
            )}
            {post.content.toLowerCase().includes("macedonia") && post.content.toLowerCase().includes("2025") && (
              <span className="px-2 py-1 text-xs font-semibold text-red-500 border border-red-500 rounded">Sospetto</span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {format(postDate, "d MMMM 'alle' HH:mm", { locale: it })}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <p className="whitespace-pre-wrap">{post.content}</p>
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="mt-2 flex gap-2">
            {post.hashtags.map((tag) => (
              <span key={tag} className="text-primary">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!isLiked && !isLiking) {
                likeMutation.mutate();
              }
            }}
            disabled={isLiked || isLiking}
          >
            <Heart
              className={`h-4 w-4 mr-2 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
            />
            {likesCount}
          </Button>
          {(user?.id === post.userId || user?.role === "owner") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}