import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchQuerySchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Search endpoint
  app.post("/api/search", async (req, res) => {
    try {
      // Validate request body
      const { domain, keyword } = searchQuerySchema.parse(req.body);
      
      // Perform search using Puppeteer
      const results = await performSearch(domain, keyword);
      
      // Store results (optional - for caching or analytics)
      for (const result of results) {
        await storage.createSearchResult({
          domain,
          keyword,
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
