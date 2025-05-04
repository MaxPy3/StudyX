import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPostSchema } from "@shared/schema";
import { generateStudyContent, searchStudyContent, generateQuiz, generateConceptMap, checkFactAccuracy } from "./gemini";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Create post
  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const post = insertPostSchema.parse(req.body);
    const isSuspicious = await checkFactAccuracy(post.content); // Added fact checking
    const created = await storage.createPost({
      ...post,
      userId: req.user.id,
      isSuspicious // Added isSuspicious flag
    });
    res.json(created);
  });

  // Get all posts
  app.get("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const posts = await storage.getPosts();
    res.json(posts);
  });

  // Get user posts
  app.get("/api/users/:id/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const posts = await storage.getUserPosts(parseInt(req.params.id));
    res.json(posts);
  });

  // Like/unlike post
  app.post("/api/posts/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Verifica se l'utente ha già messo like al post
      const existingLikes = await storage.getLikes(postId);
      const alreadyLiked = existingLikes.some(like => like.userId === userId);
      
      if (alreadyLiked) {
        return res.status(409).json({ message: "Hai già messo like a questo post" });
      }
      
      await storage.likePost(userId, postId);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error in like post:", error);
      res.status(500).json({ message: "Errore nell'aggiungere il like" });
    }
  });

  app.delete("/api/posts/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.unlikePost(req.user.id, parseInt(req.params.id));
    res.sendStatus(200);
  });

  // Get post likes
  app.get("/api/posts/:id/likes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const postId = parseInt(req.params.id);
      const likes = await storage.getLikes(postId);
      
      // Controlla se l'utente attuale ha messo like
      const hasLiked = likes.some(like => like.userId === req.user.id);
      
      // Restituisci il numero totale di like e se l'utente ha messo like
      res.json({
        count: likes.length,
        hasLiked: hasLiked,
        userIds: likes.map(like => like.userId)
      });
    } catch (error) {
      console.error("Error in get likes:", error);
      res.status(500).json({ message: "Errore nel recupero dei like" });
    }
  });

  // Delete post
  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const postId = parseInt(req.params.id);
    const success = await storage.deletePost(postId, req.user.id);
    if (success) {
      res.sendStatus(200);
    } else {
      res.sendStatus(403);
    }
  });

  // Generate study content
  app.post("/api/generate-content", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const content = await generateStudyContent(req.body.prompt);
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate content" });
    }
  });

  // Search study content
  app.get("/api/search-content", async (req, res) => {
    // Temporaneamente rimuoviamo il controllo di autenticazione per debug
    // if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const query = req.query.q as string;
      console.log("[search-content] Searching for:", query);
      const content = await searchStudyContent(query);
      console.log("[search-content] Found content with title:", content.title);
      res.json([content]); // Wrap in array since the frontend expects an array
    } catch (error) {
      console.error("[search-content] Error:", error);
      res.status(500).json({ message: "Failed to search content" });
    }
  });

  // Generate quiz
  app.post("/api/generate-quiz", async (req, res) => {
    // Temporaneamente rimuoviamo il controllo di autenticazione per debug
    // if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      console.log("[quiz] Generating quiz for topic:", req.body.topic);
      const quiz = await generateQuiz(req.body.topic);
      console.log("[quiz] Quiz generation successful, items:", Array.isArray(quiz) ? quiz.length : 0);
      res.json(quiz);
    } catch (error) {
      console.error("[quiz] Error generating quiz:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  // Generate concept map
  app.post("/api/generate-map", async (req, res) => {
    // Temporaneamente rimuoviamo il controllo di autenticazione per debug
    // if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      console.log("[map] Generating concept map for topic:", req.body.topic);
      const map = await generateConceptMap(req.body.topic);
      console.log("[map] Map generation successful, nodes:", map.nodes.length);
      res.json(map);
    } catch (error) {
      console.error("[map] Error generating concept map:", error);
      res.status(500).json({ message: "Failed to generate concept map" });
    }
  });

  app.post('/api/logout', (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  app.post('/api/tutor', async (req, res) => {
    try {
      const result = await generateStudyContent(`
        Come tutor didattico, rispondi a questa domanda: ${req.body.message}

        Rispondi in modo conciso, chiaro e in italiano.
        Mantieni un tono amichevole e incoraggiante.
      `);

      res.json({ response: result.content });
    } catch (error) {
      console.error('Tutor error:', error);
      res.status(500).json({ error: 'Errore del tutor' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}