import { 
  users, 
  searchResults, 
  searchHistory,
  type User, 
  type UpsertUser, 
  type SearchResult, 
  type InsertSearchResult,
  type SearchHistory,
  type InsertSearchHistory,
  type SearchHistoryWithResults
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Search history operations
  createSearchHistory(history: InsertSearchHistory): Promise<SearchHistory>;
  getUserSearchHistory(userId: string): Promise<SearchHistoryWithResults[]>;
  
  // Search results operations
  createSearchResult(result: InsertSearchResult): Promise<SearchResult>;
  getSearchResults(searchHistoryId: number): Promise<SearchResult[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Search history operations
  async createSearchHistory(history: InsertSearchHistory): Promise<SearchHistory> {
    const [searchHist] = await db
      .insert(searchHistory)
      .values(history)
      .returning();
    return searchHist;
  }

  async getUserSearchHistory(userId: string): Promise<SearchHistoryWithResults[]> {
    const historiesWithResults = await db.query.searchHistory.findMany({
      where: eq(searchHistory.userId, userId),
      orderBy: [desc(searchHistory.createdAt)],
      with: {
        results: true,
      },
    });

    return historiesWithResults;
  }

  // Search results operations
  async createSearchResult(result: InsertSearchResult): Promise<SearchResult> {
    const [searchResult] = await db
      .insert(searchResults)
      .values(result)
      .returning();
    return searchResult;
  }

  async getSearchResults(searchHistoryId: number): Promise<SearchResult[]> {
    return await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchHistoryId, searchHistoryId));
  }
}

export const storage = new DatabaseStorage();
