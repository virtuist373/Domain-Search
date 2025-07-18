import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Globe, ExternalLink, Clock, AlertTriangle, Loader2, Download, User, LogIn, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { searchQuerySchema, type SearchResult, type SearchQuery } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

export default function SearchPage() {
  const { toast } = useToast();
  const { isAuthenticated, isAnonymous, user } = useAuth();
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Search className="text-primary h-6 w-6 cursor-pointer" />
              </Link>
              <Link href="/">
                <h1 className="text-xl font-semibold cursor-pointer">Domain Search</h1>
              </Link>
            </div>

            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">
                    Welcome back, {user?.firstName || user?.email}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = "/api/logout"}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">Anonymous User</span>
                  <Button 
                    size="sm"
                    onClick={() => window.location.href = "/api/login"}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Anonymous User Upgrade Banner */}
        {isAnonymous && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <History className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  <strong>Anonymous Search Mode</strong> - Search results won't be saved. 
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-blue-600 dark:text-blue-400"
                    onClick={() => window.location.href = "/api/login"}
                  >
                    Sign in
                  </Button> to unlock search history and CSV downloads.
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Search Form */}
        <Card className="mb-8">
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
                              className="pr-10 surface"
                              {...field}
                            />
                            <Globe className="absolute right-3 top-3 h-4 w-4 text-secondary" />
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
                              className="pr-10 surface"
                              {...field}
                            />
                            <Search className="absolute right-3 top-3 h-4 w-4 text-secondary" />
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
                  <span className="text-secondary">Searching domain content...</span>
                </div>
              </CardContent>
            </Card>

            {/* Skeleton Loading Cards */}
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="h-6 surface rounded w-3/4"></div>
                      <div className="h-4 surface rounded w-1/2"></div>
                      <div className="h-4 surface rounded w-full"></div>
                      <div className="h-4 surface rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {searchMutation.isError && !searchMutation.isPending && (
          <Card className="border-red-500/20">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <AlertTriangle className="text-red-500 text-3xl mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Search Failed</h3>
              <p className="text-secondary mb-6">
                Unable to complete the search. This could be due to rate limiting, network issues, or the domain being blocked.
              </p>
              <div className="space-x-3">
                <Button onClick={retrySearch} className="px-6 py-3">
                  <Search className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    form.reset();
                    setSearchResults([]);
                    setCurrentQuery("");
                  }}
                  className="px-6 py-3"
                >
                  Clear Search
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!searchMutation.isPending && !searchMutation.isError && searchResults.length === 0 && currentQuery && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <Search className="text-muted-foreground text-3xl mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground mb-6">
                No content found for your search query. Try adjusting your keywords or checking the domain name.
              </p>
              <Button onClick={() => form.getValues("domain") && document.getElementById("domain")?.focus()}>
                <Search className="h-4 w-4 mr-2" />
                Try New Search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
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
                <span>{isAuthenticated ? "Download CSV" : "Download CSV (Sign in required)"}</span>
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
      </main>
    </div>
  );
}