import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchQuerySchema, advancedSearchQuerySchema, insertSavedSearchSchema, updateSavedSearchSchema } from "@shared/schema";
import type { SearchQuery, AdvancedSearchQuery } from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth, isAuthenticated, optionalAuth } from "./replitAuth";
import { buildBasicQuery, buildAdvancedQuery, getDateFilterParams, getLocalizationParams } from "./queryBuilder";

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

  // Search endpoint - supports both authenticated and anonymous users
  app.post("/api/search", optionalAuth, async (req: any, res) => {
    try {
      // Validate request body
      const { domain, keyword } = searchQuerySchema.parse(req.body);
      
      // Perform search using Serper API
      const results = await performSearch(domain, keyword);
      
      // If user is authenticated, save search history
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        
        try {
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
        } catch (historyError) {
          // Don't fail the search if history saving fails
          console.error("Failed to save search history:", historyError);
        }
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

  // Advanced search endpoint - supports both authenticated and anonymous users
  app.post("/api/search/advanced", optionalAuth, async (req: any, res) => {
    try {
      // Validate request body
      const searchParams = advancedSearchQuerySchema.parse(req.body);
      
      // Build advanced query
      const queryComponents = buildAdvancedQuery(searchParams);
      
      // Get additional search parameters
      const dateParams = getDateFilterParams(searchParams.dateRange);
      const localizationParams = getLocalizationParams(searchParams.language, searchParams.region);
      
      // Perform search using Serper API
      const results = await performAdvancedSearch(queryComponents, { ...dateParams, ...localizationParams });
      
      // If user is authenticated, save search history
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        
        try {
          // Create search history entry with combined description
          const searchHist = await storage.createSearchHistory({
            userId,
            domain: searchParams.domain,
            keyword: queryComponents.description,
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
        } catch (historyError) {
          // Don't fail the search if history saving fails
          console.error("Failed to save search history:", historyError);
        }
      }
      
      res.json({
        results,
        queryInfo: {
          query: queryComponents.query,
          operators: queryComponents.operators,
          description: queryComponents.description
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid advanced search parameters",
          errors: error.errors 
        });
      }
      
      console.error("Advanced search error:", error);
      res.status(500).json({ 
        message: "Advanced search failed. Please try again later."
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

  // Saved searches endpoints
  app.get("/api/saved-searches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const savedSearches = await storage.getUserSavedSearches(userId);
      res.json(savedSearches);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(500).json({ message: "Failed to fetch saved searches" });
    }
  });

  app.post("/api/saved-searches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const savedSearchData = { ...req.body, userId };
      
      // Validate the saved search data
      const validatedData = insertSavedSearchSchema.parse(savedSearchData);
      
      const savedSearch = await storage.createSavedSearch(validatedData);
      res.status(201).json(savedSearch);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid saved search data",
          errors: error.errors 
        });
      }
      
      console.error("Error creating saved search:", error);
      res.status(500).json({ message: "Failed to create saved search" });
    }
  });

  app.put("/api/saved-searches/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const searchId = parseInt(req.params.id);
      
      if (isNaN(searchId)) {
        return res.status(400).json({ message: "Invalid search ID" });
      }
      
      // Validate the update data
      const validatedData = updateSavedSearchSchema.parse(req.body);
      
      const updatedSearch = await storage.updateSavedSearch(searchId, userId, validatedData);
      res.json(updatedSearch);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid saved search data",
          errors: error.errors 
        });
      }
      
      console.error("Error updating saved search:", error);
      res.status(500).json({ message: "Failed to update saved search" });
    }
  });

  app.delete("/api/saved-searches/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const searchId = parseInt(req.params.id);
      
      if (isNaN(searchId)) {
        return res.status(400).json({ message: "Invalid search ID" });
      }
      
      await storage.deleteSavedSearch(searchId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting saved search:", error);
      res.status(500).json({ message: "Failed to delete saved search" });
    }
  });

  app.get("/api/saved-searches/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const searchId = parseInt(req.params.id);
      
      if (isNaN(searchId)) {
        return res.status(400).json({ message: "Invalid search ID" });
      }
      
      const savedSearch = await storage.getSavedSearch(searchId, userId);
      
      if (!savedSearch) {
        return res.status(404).json({ message: "Saved search not found" });
      }
      
      res.json(savedSearch);
    } catch (error) {
      console.error("Error fetching saved search:", error);
      res.status(500).json({ message: "Failed to fetch saved search" });
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

async function performAdvancedSearch(queryComponents: any, extraParams: any = {}) {
  const apiKey = process.env.SERPER_API_KEY;
  
  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not configured");
  }

  try {
    console.log(`Advanced searching with Serper.dev: ${queryComponents.query}`);
    console.log(`Query operators: ${queryComponents.operators.join(', ')}`);
    
    const searchParams = {
      q: queryComponents.query,
      num: 10,
      ...extraParams
    };
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchParams),
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
    
    console.log(`Found ${results.length} results from advanced search`);
    
    return results;
    
  } catch (error) {
    console.error("Advanced search error:", error);
    throw new Error("Failed to perform advanced search. Please try again.");
  }
}
