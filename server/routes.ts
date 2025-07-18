import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchQuerySchema } from "@shared/schema";
import { ZodError } from "zod";
import puppeteer from "puppeteer";

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
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Construct Google search query
    const searchQuery = `site:${domain} ${keyword}`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10`;
    
    // Navigate to Google search
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Wait for search results to load
    await page.waitForSelector('div[data-ved]', { timeout: 10000 });
    
    // Extract search results
    const results = await page.evaluate(() => {
      const searchResults: Array<{title: string, url: string, snippet: string}> = [];
      
      // Select search result containers
      const resultElements = document.querySelectorAll('div[data-ved] h3');
      
      resultElements.forEach((titleElement, index) => {
        if (index >= 10) return; // Limit to 10 results
        
        const title = titleElement.textContent?.trim() || '';
        
        // Find the parent link element
        const linkElement = titleElement.closest('a') as HTMLAnchorElement;
        const url = linkElement?.href || '';
        
        // Find the snippet
        let snippet = '';
        const resultContainer = titleElement.closest('div[data-ved]');
        if (resultContainer) {
          const snippetElement = resultContainer.querySelector('span:not([class])');
          snippet = snippetElement?.textContent?.trim() || '';
        }
        
        if (title && url && !url.includes('google.com')) {
          searchResults.push({ title, url, snippet });
        }
      });
      
      return searchResults;
    });
    
    return results;
    
  } catch (error) {
    console.error("Puppeteer search error:", error);
    throw new Error("Failed to perform search. Please try again.");
  } finally {
    await browser.close();
  }
}
