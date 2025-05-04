import { InsertUser, InsertPost, User, Post, Like, UpdateUser, users, posts, likes } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { and, desc, eq } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: UpdateUser): Promise<User>;

  createPost(post: InsertPost & { userId: number }): Promise<Post>;
  getPosts(): Promise<(Post & { user: User })[]>;
  getUserPosts(userId: number): Promise<Post[]>;

  likePost(userId: number, postId: number): Promise<void>;
  unlikePost(userId: number, postId: number): Promise<void>;
  getLikes(postId: number): Promise<Like[]>;

  sessionStore: session.Store;
  deletePost(postId: number, userId?: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const role = insertUser.username === "Max" ? "owner" : "user";
    const result = await db.insert(users).values({
      ...insertUser,
      role,
      bio: null,
      avatarUrl: null
    }).returning();
    
    return result[0];
  }

  async updateUser(id: number, data: UpdateUser): Promise<User> {
    const result = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
    if (result.length === 0) throw new Error("User not found");
    return result[0];
  }

  async createPost(post: InsertPost & { userId: number }): Promise<Post> {
    const result = await db.insert(posts).values(post).returning();
    return result[0];
  }

  async getPosts(): Promise<(Post & { user: User })[]> {
    // In una query reale si userebbe un JOIN, ma per semplicità facciamo due query
    const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));
    
    // Use a standard array and filter out duplicates
    const userIdsWithDuplicates = allPosts.map(post => post.userId);
    const userIds: number[] = [];
    userIdsWithDuplicates.forEach(id => {
      if (!userIds.includes(id)) {
        userIds.push(id);
      }
    });
    
    const usersMap = new Map<number, User>();
    await Promise.all(
      userIds.map(async (userId) => {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (user) usersMap.set(userId, user);
      })
    );
    
    return allPosts.map(post => ({
      ...post,
      hashtags: post.hashtags || null,
      isSuspicious: post.isSuspicious || false,
      user: usersMap.get(post.userId)!
    }));
  }

  async getUserPosts(userId: number): Promise<Post[]> {
    const result = await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));
      
    return result.map(post => ({
      ...post,
      hashtags: post.hashtags || null,
      isSuspicious: post.isSuspicious || false
    }));
  }

  async likePost(userId: number, postId: number): Promise<void> {
    await db.insert(likes).values({ userId, postId });
  }

  async unlikePost(userId: number, postId: number): Promise<void> {
    await db.delete(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.postId, postId)
      ));
  }

  async getLikes(postId: number): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.postId, postId));
  }

  async deletePost(postId: number, userId?: number): Promise<boolean> {
    // Prima verifica se l'utente può eliminare il post
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    
    if (!post) return false;
    
    // Se userId è fornito, verifica che sia il proprietario o un admin
    if (userId !== undefined && post.userId !== userId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || user.role !== "owner") {
        return false;
      }
    }
    
    // Elimina prima i likes associati
    await db.delete(likes).where(eq(likes.postId, postId));
    
    // Poi elimina il post
    await db.delete(posts).where(eq(posts.id, postId));
    
    return true;
  }
}

export const storage = new DatabaseStorage();