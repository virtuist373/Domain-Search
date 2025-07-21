import { pgTable, text, varchar, timestamp, jsonb, index, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Search history table to store user searches
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  keyword: text("keyword").notNull(),
  resultsCount: serial("results_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Search results table linked to search history
export const searchResults = pgTable("search_results", {
  id: serial("id").primaryKey(),
  searchHistoryId: serial("search_history_id").notNull().references(() => searchHistory.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  snippet: text("snippet").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved searches table for user's favorite search configurations
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  domain: text("domain").notNull(),
  includeTerms: text("include_terms"),
  excludeTerms: text("exclude_terms"),
  exactPhrase: text("exact_phrase"),
  anyOfTerms: text("any_of_terms"),
  allOfTerms: text("all_of_terms"),
  fileType: text("file_type"),
  dateRange: varchar("date_range").default("any"),
  language: text("language"),
  region: varchar("region").default("us"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  searchHistory: many(searchHistory),
  savedSearches: many(savedSearches),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one, many }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
  results: many(searchResults),
}));

export const searchResultsRelations = relations(searchResults, ({ one }) => ({
  searchHistory: one(searchHistory, {
    fields: [searchResults.searchHistoryId],
    references: [searchHistory.id],
  }),
}));

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, {
    fields: [savedSearches.userId],
    references: [users.id],
  }),
}));

// Schema for upserting users (for Replit Auth)
export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting search history
export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting search results
export const insertSearchResultSchema = createInsertSchema(searchResults).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting saved searches
export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for updating saved searches
export const updateSavedSearchSchema = createInsertSchema(savedSearches).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for basic search queries from frontend
export const searchQuerySchema = z.object({
  domain: z.string().min(1, "Domain is required").refine((val) => {
    // Basic domain validation - no protocol, valid format
    return /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/.test(val);
  }, "Please enter a valid domain (e.g., example.com)"),
  keyword: z.string().min(1, "Keywords are required").max(200, "Keywords too long"),
});

// Schema for advanced search queries with operators
export const advancedSearchQuerySchema = z.object({
  domain: z.string().min(1, "Domain is required").refine((val) => {
    // Basic domain validation - no protocol, valid format
    return /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/.test(val);
  }, "Please enter a valid domain (e.g., example.com)"),
  includeTerms: z.string().optional(),
  excludeTerms: z.string().optional(),
  exactPhrase: z.string().optional(),
  anyOfTerms: z.string().optional(),
  allOfTerms: z.string().optional(),
  fileType: z.string().optional(),
  dateRange: z.enum(["any", "day", "week", "month", "year"]).optional().default("any"),
  language: z.string().optional(),
  region: z.string().optional().default("us"),
});

// Type exports
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SearchResult = typeof searchResults.$inferSelect;
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type UpdateSavedSearch = z.infer<typeof updateSavedSearchSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type AdvancedSearchQuery = z.infer<typeof advancedSearchQuerySchema>;

// Extended types for frontend
export type SearchHistoryWithResults = SearchHistory & {
  results: SearchResult[];
};
