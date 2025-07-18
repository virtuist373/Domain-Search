import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Globe, ExternalLink, Clock, AlertTriangle, Loader2, Download, History, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { searchQuerySchema, type SearchResult, type SearchQuery, type SearchHistoryWithResults } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTime, setSearchTime] = useState<string>("");
  const [currentQuery, setCurrentQuery] = useState<string>("");

  const form = useForm<SearchQuery>({
    resolver: zodResolver(searchQuerySchema),
    defaultValues: {
      domain: "",
      keyword: "",
    },
  });

  // Fetch search history
  const { data: searchHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery<SearchHistoryWithResults[]>({
    queryKey: ["/api/search-history"],
    retry: false,
  });

  const searchMutation = useMutation({
    mutationFn: async (data: SearchQuery) => {
      const startTime = Date.now();
      const response = await apiRequest("POST", "/api/search", data);
      const results = await response.json();
      const endTime = Date.now();
      setSearchTime(((endTime - startTime) / 1000).toFixed(1));
      return results;
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setCurrentQuery(`site:${form.getValues("domain")} ${form.getValues("keyword")}`);
      refetchHistory(); // Refresh search history
      if (data.length === 0) {
        toast({
          title: "No Results Found",
          description: "Try adjusting your keywords or checking the domain name.",
        });
      }
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Search Failed",
        description: error.message || "Unable to complete the search. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SearchQuery) => {
    searchMutation.mutate(data);
  };

  const retrySearch = () => {
    const formData = form.getValues();
    if (formData.domain && formData.keyword) {
      searchMutation.mutate(formData);
    }
  };

  const downloadCSV = () => {
    if (searchResults.length === 0) return;

    const headers = ['Title', 'URL', 'Snippet', 'Domain', 'Keywords'];
    const csvRows = searchResults.map(result => [
      `"${result.title.replace(/"/g, '""')}"`,
      `"${result.url}"`,
      `"${result.snippet.replace(/"/g, '""')}"`,
      `"${form.getValues('domain')}"`,
      `"${form.getValues('keyword')}"`
    ]);

    const csvContent = [headers, ...csvRows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
      const domain = form.getValues('domain');
      const filename = `search-results-${domain}-${timestamp}.csv`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "CSV Downloaded",
        description: `Search results exported to ${filename}`,
      });
    }
  };

  const loadHistoryResults = (historyItem: SearchHistoryWithResults) => {
    form.setValue("domain", historyItem.domain);
    form.setValue("keyword", historyItem.keyword);
    setSearchResults(historyItem.results);
    setCurrentQuery(`site:${historyItem.domain} ${historyItem.keyword}`);
    setSearchTime("0.0"); // Historical results don't have timing
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Search className="text-primary h-6 w-6" />
              <h1 className="text-xl font-semibold">Domain Search</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img 
                  src={user?.profileImageUrl || ""} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-sm text-muted-foreground">
                  {user?.firstName || user?.email}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = "/api/logout"}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-8">
            {/* Search Form */}
            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold mb-2">Search Domain-Specific Content</h2>
                  <p className="text-muted-foreground">Find content from specific domains using targeted Google searches</p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="example.com"
                                  className="pr-10"
                                  {...field}
                                />
                                <Globe className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Enter domain without protocol (e.g., github.com)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="keyword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Keywords</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="react hooks tutorial"
                                  className="pr-10"
                                  {...field}
                                />
                                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Search terms to find within the domain
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-center">
                      <Button 
                        type="submit" 
                        className="px-8 py-2 font-medium flex items-center space-x-2"
                        disabled={searchMutation.isPending}
                      >
                        {searchMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        <span>{searchMutation.isPending ? "Searching..." : "Search"}</span>
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Loading State */}
            {searchMutation.isPending && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center space-x-3 py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-muted-foreground">Searching domain content...</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="h-6 bg-muted rounded w-3/4"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                          <div className="h-4 bg-muted rounded w-full"></div>
                          <div className="h-4 bg-muted rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && !searchMutation.isPending && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-card rounded-lg border border-border p-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-muted-foreground">Search results</span>
                    <div className="text-sm text-muted-foreground">
                      <span>{searchResults.length}</span> results found in <span>{searchTime}s</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCSV}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download CSV</span>
                  </Button>
                </div>

                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <Card key={index} className="hover:border-primary/20 transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold hover:text-primary cursor-pointer transition-colors">
                            <a href={result.url} target="_blank" rel="noopener noreferrer">
                              {result.title}
                            </a>
                          </h3>

                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate block"
                          >
                            {result.url}
                          </a>

                          <p className="text-muted-foreground leading-relaxed">
                            {result.snippet}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="h-6 bg-muted rounded w-1/2"></div>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchHistory && searchHistory.length > 0 ? (
              <div className="space-y-4">
                {searchHistory.map((historyItem) => (
                  <Card key={historyItem.id} className="hover:border-primary/20 transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{historyItem.domain}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{historyItem.keyword}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{historyItem.resultsCount} results</span>
                            <span>•</span>
                            <span>{new Date(historyItem.createdAt!).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadHistoryResults(historyItem)}
                          className="flex items-center space-x-2"
                        >
                          <Search className="h-4 w-4" />
                          <span>View Results</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Search History</h3>
                  <p className="text-muted-foreground mb-6">
                    Your search history will appear here once you start searching.
                  </p>
                  <Button onClick={() => document.querySelector('[value="search"]')?.click()}>
                    Start Searching
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}