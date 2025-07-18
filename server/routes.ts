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
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent and other headers to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });
    
    // Construct Google search query
    const searchQuery = `site:${domain} ${keyword}`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10`;
    
    // Navigate to Google search
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for page to load and try multiple selectors
    await page.waitForTimeout(3000);
    
    // Check if we have search results
    const hasResults = await page.evaluate(() => {
      return document.querySelectorAll('div[data-ved]').length > 0 || 
             document.querySelectorAll('.g').length > 0 ||
             document.querySelectorAll('[data-sokoban-container]').length > 0;
    });
    
    if (!hasResults) {
      throw new Error('No search results found - page may have been blocked');
    }
    
    // Extract search results
    const results = await page.evaluate(() => {
      const searchResults: Array<{title: string, url: string, snippet: string}> = [];
      
      // Try multiple selector strategies
      let resultElements: NodeListOf<Element> | null = null;
      
      // Strategy 1: Modern Google layout
      resultElements = document.querySelectorAll('div[data-ved] h3');
      if (resultElements.length === 0) {
        // Strategy 2: Alternative layout
        resultElements = document.querySelectorAll('.g h3');
      }
      if (resultElements.length === 0) {
        // Strategy 3: Fallback
        resultElements = document.querySelectorAll('[data-sokoban-container] h3');
      }
      
      resultElements?.forEach((titleElement, index) => {
        if (index >= 10) return; // Limit to 10 results
        
        const title = titleElement.textContent?.trim() || '';
        
        // Find the parent link element
        const linkElement = titleElement.closest('a') as HTMLAnchorElement;
        const url = linkElement?.href || '';
        
        // Find the snippet with multiple strategies
        let snippet = '';
        const resultContainer = titleElement.closest('div[data-ved]') || titleElement.closest('.g');
        if (resultContainer) {
          // Try different snippet selectors
          let snippetElement = resultContainer.querySelector('span:not([class])');
          if (!snippetElement) {
            snippetElement = resultContainer.querySelector('.VwiC3b');
          }
          if (!snippetElement) {
            snippetElement = resultContainer.querySelector('[data-content-feature]');
          }
          snippet = snippetElement?.textContent?.trim() || '';
        }
        
        if (title && url && !url.includes('google.com') && !url.includes('googleusercontent.com')) {
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
