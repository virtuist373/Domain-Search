import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchQuerySchema } from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Search endpoint - updated to work with authenticated users
  app.post("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      // Validate request body
      const { domain, keyword } = searchQuerySchema.parse(req.body);
      
      // Get user ID from auth
      const userId = req.user.claims.sub;
      
      // Perform search using Serper API
      const results = await performSearch(domain, keyword);
      
      // Create search history entry
      const searchHist = await storage.createSearchHistory({
        userId,
        domain,
        keyword,
        resultsCount: results.length,
      });
      
      // Store individual search results
      for (const result of results) {
        await storage.createSearchResult({
          searchHistoryId: searchHist.id,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        });
      }
      
      res.json(results);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      
      console.error("Search error:", error);
      res.status(500).json({ 
        message: "Search failed. Please try again later."
      });
    }
  });

  // Search history endpoint
  app.get("/api/search-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getUserSearchHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function performSearch(domain: string, keyword: string) {
  const apiKey = process.env.SERPER_API_KEY;
  
  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not configured");
  }

  try {
    // Construct search query with site restriction
    const searchQuery = `site:${domain} ${keyword}`;
    
    console.log(`Searching with Serper.dev: ${searchQuery}`);
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10,
        gl: 'us',
        hl: 'en'
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform Serper results to match our expected format
    const results = data.organic?.map((result: any) => ({
      title: result.title || 'No title',
      url: result.link || '',
      snippet: result.snippet || 'No snippet available'
    })) || [];
    
    console.log(`Found ${results.length} results from Serper.dev`);
    
    return results;
    
  } catch (error) {
    console.error("Serper search error:", error);
    throw new Error("Failed to perform search. Please try again.");
  }
}
