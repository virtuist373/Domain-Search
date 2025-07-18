import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const searchResults = pgTable("search_results", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  keyword: text("keyword").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  snippet: text("snippet").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSearchResultSchema = createInsertSchema(searchResults).pick({
  domain: true,
  keyword: true,
  title: true,
  url: true,
  snippet: true,
});

export const searchQuerySchema = z.object({
  domain: z.string().min(1, "Domain is required").refine((val) => {
    // Basic domain validation - no protocol, valid format
    return /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/.test(val);
  }, "Please enter a valid domain (e.g., example.com)"),
  keyword: z.string().min(1, "Keywords are required").max(200, "Keywords too long"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SearchResult = typeof searchResults.$inferSelect;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
