import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Globe, ExternalLink, Clock, AlertTriangle, Loader2, Download, History, User, LogOut, LogIn, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { searchQuerySchema, type SearchResult, type SearchQuery, type SearchHistoryWithResults } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
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

  // Fetch search history only for authenticated users
  const { data: searchHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery<SearchHistoryWithResults[]>({
    queryKey: ["/api/search-history"],
    retry: false,
    enabled: isAuthenticated, // Only fetch if authenticated
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
      if (isAuthenticated) {
        refetchHistory(); // Refresh search history for authenticated users
      }
      if (data.length === 0) {
        toast({
          title: "No Results Found",
          description: "Try adjusting your keywords or checking the domain name.",
        });
      }
    },
    onError: (error: any) => {
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

    // Check if user is authenticated
    if (!isAuthenticated) {
      toast({
        title: "Sign In Required",
        description: "CSV download is available for signed-in users. Please sign in to download results.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV headers
    const headers = ['Title', 'URL', 'Snippet', 'Domain', 'Keywords'];
    
    // Create CSV rows
    const csvRows = searchResults.map(result => [
      `"${result.title.replace(/"/g, '""')}"`, // Escape quotes in title
      `"${result.url}"`,
      `"${result.snippet.replace(/"/g, '""')}"`, // Escape quotes in snippet
      `"${form.getValues('domain')}"`,
      `"${form.getValues('keyword')}"`
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map(row => row.join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Create filename with domain and timestamp
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

  const loadHistorySearch = (historyItem: SearchHistoryWithResults) => {
    form.setValue("domain", historyItem.domain);
    form.setValue("keyword", historyItem.keyword);
    setSearchResults(historyItem.results);
    setCurrentQuery(`site:${historyItem.domain} ${historyItem.keyword}`);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">
                    Welcome, {user?.firstName || user?.email}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = "/api/logout"}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => window.location.href = "/api/login"}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {isAuthenticated ? (
          // Authenticated user experience with tabs
          <Tabs defaultValue="search" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="history">Search History</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
              {/* Search Form */}
              <Card>
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold mb-2">Search Domain-Specific Content</h2>
                    <p className="text-muted-foreground">Find pages from specific domains that mention specific keywords</p>
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

              {/* Search Results */}
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
                </div>
              )}

              {searchResults.length > 0 && !searchMutation.isPending && (
                <div className="space-y-6">
                  {/* Search Stats */}
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

                  {/* Results List */}
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
              {/* Search History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="h-5 w-5" />
                    <span>Search History</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : searchHistory && searchHistory.length > 0 ? (
                    <div className="space-y-4">
                      {searchHistory.map((item) => (
                        <Card key={item.id} className="hover:border-primary/20 transition-colors cursor-pointer" onClick={() => loadHistorySearch(item)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="font-medium">
                                  site:{item.domain} {item.keyword}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {item.resultsCount} results • {new Date(item.createdAt!).toLocaleDateString()}
                                </p>
                              </div>
                              <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No search history yet. Start searching to see your history here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          // Anonymous user experience
          <div className="space-y-8">
            {/* Sign-up promotion card */}
            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  <div className="lg:col-span-2">
                    <h2 className="text-2xl font-semibold mb-2 text-foreground">
                      Search Any Domain's Content
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      Find specific content within any website using targeted searches. 
                      Search for free, or sign in to unlock search history and CSV downloads.
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-primary" />
                        <span>Free domain searches</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <History className="h-4 w-4 text-primary" />
                        <span>Search history (sign-in required)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Download className="h-4 w-4 text-primary" />
                        <span>CSV downloads (sign-in required)</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center lg:text-right">
                    <Button 
                      size="lg" 
                      onClick={() => window.location.href = "/api/login"}
                      className="px-8 py-3"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In Free
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Form */}
            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold mb-2">Try Free Search</h2>
                  <p className="text-muted-foreground">Find pages from specific domains that mention specific keywords</p>
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
                        <span>{searchMutation.isPending ? "Searching..." : "Search for Free"}</span>
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Anonymous user search results */}
            {searchMutation.isPending && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-3 py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-muted-foreground">Searching domain content...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {searchResults.length > 0 && !searchMutation.isPending && (
              <div className="space-y-6">
                {/* Search Stats with upgrade prompt */}
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
                    <span>Download CSV (Sign in required)</span>
                  </Button>
                </div>

                {/* Upgrade banner */}
                <Alert className="border-primary/20 bg-card/50 backdrop-blur-sm">
                  <Database className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">
                        <strong>Want to save these results?</strong> Sign in free to enable search history and CSV downloads.
                      </span>
                      <Button 
                        size="sm" 
                        onClick={() => window.location.href = "/api/login"}
                        className="ml-4"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Results List */}
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
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-2 text-center">
          <p className="text-xs text-muted-foreground/60">
            Made by{' '}
            <a 
              href="https://tannerbraden.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground/80 hover:text-muted-foreground transition-colors"
            >
              Tanner Braden
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}