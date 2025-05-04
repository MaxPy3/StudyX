import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Post, User } from "@shared/schema";
import PostCard from "@/components/post-card";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRoute } from "wouter";

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const userId = parseInt(params?.id ?? "0");

  const { data: posts } = useQuery<(Post & { user: User })[]>({ 
    queryKey: [`/api/users/${userId}/posts`]
  });

  const { data: user } = useQuery<User>({ 
    queryKey: [`/api/users/${userId}`]
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardContent className="flex items-center gap-4 p-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback>
                {user.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user.username}</h1>
              {user.bio && <p className="text-muted-foreground">{user.bio}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="max-w-2xl mx-auto space-y-6">
          {posts?.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}