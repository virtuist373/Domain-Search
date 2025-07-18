import { users, searchResults, type User, type InsertUser, type SearchResult, type InsertSearchResult } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createSearchResult(result: InsertSearchResult): Promise<SearchResult>;
  getSearchResults(domain: string, keyword: string): Promise<SearchResult[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private searchResults: Map<number, SearchResult>;
  private currentUserId: number;
  private currentSearchId: number;

  constructor() {
    this.users = new Map();
    this.searchResults = new Map();
    this.currentUserId = 1;
    this.currentSearchId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createSearchResult(insertResult: InsertSearchResult): Promise<SearchResult> {
    const id = this.currentSearchId++;
    const result: SearchResult = { 
      ...insertResult, 
      id,
      createdAt: new Date()
    };
    this.searchResults.set(id, result);
    return result;
  }

  async getSearchResults(domain: string, keyword: string): Promise<SearchResult[]> {
    return Array.from(this.searchResults.values()).filter(
      (result) => result.domain === domain && result.keyword === keyword,
    );
  }
}

export const storage = new MemStorage();
