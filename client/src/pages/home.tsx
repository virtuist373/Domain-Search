import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Globe, ExternalLink, Clock, AlertTriangle, Loader2, Download, History, User, LogOut, LogIn, Database, Zap, Target, Copy, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { searchQuerySchema, type SearchResult, type SearchQuery, type SearchHistoryWithResults, type AdvancedSearchQuery } from "@shared/schema";
import AdvancedSearchForm from "@/components/AdvancedSearchForm";
import SavedSearches from "@/components/SavedSearches";

export default function Home() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTime, setSearchTime] = useState<string>("");
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [queryInfo, setQueryInfo] = useState<any>(null);
  const [loadedSearchData, setLoadedSearchData] = useState<AdvancedSearchQuery | undefined>();
  const [currentFormData, setCurrentFormData] = useState<AdvancedSearchQuery | undefined>();
  const [activeTab, setActiveTab] = useState<string>("search");

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
      setQueryInfo(null); // Clear advanced query info for basic search
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

  const advancedSearchMutation = useMutation({
    mutationFn: async (data: AdvancedSearchQuery) => {
      const startTime = Date.now();
      const response = await apiRequest("POST", "/api/search/advanced", data);
      const result = await response.json();
      const endTime = Date.now();
      setSearchTime(((endTime - startTime) / 1000).toFixed(1));
      return result;
    },
    onSuccess: (data) => {
      setSearchResults(data.results);
      setCurrentQuery(data.queryInfo.query);
      setQueryInfo(data.queryInfo);
      if (isAuthenticated) {
        refetchHistory(); // Refresh search history for authenticated users
      }
      if (data.results.length === 0) {
        toast({
          title: "No Results Found",
          description: "Try adjusting your search criteria or operators.",
        });
      } else {
        toast({
          title: "Advanced Search Complete",
          description: `Found ${data.results.length} results using advanced operators`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Advanced Search Failed",
        description: error.message || "Unable to complete the advanced search. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SearchQuery) => {
    searchMutation.mutate(data);
  };

  const onAdvancedSubmit = (data: AdvancedSearchQuery) => {
    advancedSearchMutation.mutate(data);
  };

  const handleLoadSavedSearch = (searchData: AdvancedSearchQuery) => {
    setLoadedSearchData(searchData);
    setCurrentFormData(searchData);
    toast({
      title: "Search Loaded",
      description: "Saved search has been loaded into the form.",
    });
  };

  const handleFormDataChange = (data: AdvancedSearchQuery) => {
    setCurrentFormData(data);
  };

  const retrySearch = () => {
    const formData = form.getValues();
    if (formData.domain && formData.keyword) {
      searchMutation.mutate(formData);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "URL Copied",
        description: "URL copied to clipboard. Paste it in the Brand Placement Scout to analyze!",
      });
    });
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
    setQueryInfo(null); // Clear advanced query info for basic search
    
    // Switch to search tab to show the results
    setActiveTab("search");
    
    toast({
      title: "Search History Loaded",
      description: `Loaded ${historyItem.results.length} results from ${historyItem.domain}`,
    });
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
              <img src="/favicon-32x32.png" alt="SiteSearch" className="h-6 w-6" />
              <h1 className="text-xl font-semibold">SiteSearch</h1>
            </div>

            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">
                    Welcome, User
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">Basic Search</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Search</TabsTrigger>
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
                    <div className="flex items-center space-x-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open('https://chatgpt.com/g/g-687a991a6b648191a27b5c3c4a7c40a8', '_blank')}
                              className="flex items-center space-x-2 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20 hover:border-green-500/40 transition-all"
                            >
                              <Target className="h-4 w-4 text-green-500" />
                              <span>Find Brand Placements</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Analyze search results with AI to find natural brand placement opportunities</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                  </div>

                  {/* Brand Placement Guide */}
                  <Alert className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-blue-500/5">
                    <Target className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">💡 Tip: Use the Brand Placement Scout</p>
                        <p className="text-sm text-muted-foreground">
                          Copy URLs from your search results and paste them into the Brand Placement Scout to discover natural placement opportunities for your brand or content.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Results List */}
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <Card key={index} className="hover:border-primary/20 transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="text-lg font-semibold hover:text-primary cursor-pointer transition-colors flex-1">
                                <a href={result.url} target="_blank" rel="noopener noreferrer">
                                  {result.title}
                                </a>
                              </h3>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyUrl(result.url)}
                                      className="ml-2 h-8 w-8 p-0 hover:bg-green-500/10"
                                    >
                                      <Copy className="h-4 w-4 text-green-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy URL for Brand Placement Scout</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

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

            <TabsContent value="advanced" className="space-y-6">
              {/* Saved Searches (only for authenticated users) */}
              {isAuthenticated && (
                <SavedSearches 
                  onLoadSearch={handleLoadSavedSearch}
                  currentSearch={currentFormData}
                />
              )}

              {/* Advanced Search Form */}
              <AdvancedSearchForm 
                onSubmit={onAdvancedSubmit}
                isLoading={advancedSearchMutation.isPending}
                loadedSearchData={loadedSearchData}
                onFormDataChange={handleFormDataChange}
              />

              {/* Advanced Search Results */}
              {advancedSearchMutation.isPending && (
                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center space-x-3 py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-muted-foreground">Processing advanced search...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {searchResults.length > 0 && !advancedSearchMutation.isPending && queryInfo && (
                <div className="space-y-6">
                  {/* Advanced Search Stats */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-card rounded-lg border border-border p-4">
                      <div className="flex items-center space-x-4">
                        <span className="text-muted-foreground">Advanced search results</span>
                        <div className="text-sm text-muted-foreground">
                          <span>{searchResults.length}</span> results found in <span>{searchTime}s</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open('https://chatgpt.com/g/g-687a991a6b648191a27b5c3c4a7c40a8', '_blank')}
                                className="flex items-center space-x-2 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20 hover:border-green-500/40 transition-all"
                              >
                                <Target className="h-4 w-4 text-green-500" />
                                <span>Find Brand Placements</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Analyze search results with AI to find natural brand placement opportunities</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                    </div>

                    {/* Query Information */}
                    <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-sm">
                          <Settings className="h-4 w-4 text-blue-500" />
                          <span>Query Information</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Generated Query:</p>
                          <code className="text-xs bg-muted p-2 rounded block break-all">{queryInfo.query}</code>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Search Operators:</p>
                          <div className="flex flex-wrap gap-1">
                            {queryInfo.operators.map((operator: string, index: number) => (
                              <span key={index} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                {operator}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Description:</p>
                          <p className="text-xs text-muted-foreground">{queryInfo.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Results List */}
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <Card key={index} className="hover:border-primary/20 transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="text-lg font-semibold hover:text-primary cursor-pointer transition-colors flex-1">
                                <a href={result.url} target="_blank" rel="noopener noreferrer">
                                  {result.title}
                                </a>
                              </h3>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyUrl(result.url)}
                                      className="ml-2 h-8 w-8 p-0 hover:bg-green-500/10"
                                    >
                                      <Copy className="h-4 w-4 text-green-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy URL for Brand Placement Scout</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

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
                        <Card key={item.id} className="hover:border-primary/20 hover:bg-accent/50 transition-all cursor-pointer group" onClick={() => loadHistorySearch(item)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1 flex-1">
                                <p className="font-medium group-hover:text-primary transition-colors">
                                  site:{item.domain} {item.keyword}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {item.resultsCount} results • {new Date(item.createdAt!).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  Click to view
                                </span>
                                <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
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
          <Tabs defaultValue="basic" className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="basic">Basic Search</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Search</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="basic" className="space-y-8">
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
                  <div className="flex items-center space-x-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://chatgpt.com/g/g-687a991a6b648191a27b5c3c4a7c40a8', '_blank')}
                            className="flex items-center space-x-2 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20 hover:border-green-500/40 transition-all"
                          >
                            <Target className="h-4 w-4 text-green-500" />
                            <span>Find Brand Placements</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Analyze search results with AI to find natural brand placement opportunities</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                </div>

                {/* Brand Placement Guide */}
                <Alert className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-blue-500/5">
                  <Target className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">💡 Tip: Use the Brand Placement Scout</p>
                      <p className="text-sm text-muted-foreground">
                        Copy URLs from your search results and paste them into the Brand Placement Scout to discover natural placement opportunities for your brand or content.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

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
                          <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold hover:text-primary cursor-pointer transition-colors flex-1">
                              <a href={result.url} target="_blank" rel="noopener noreferrer">
                                {result.title}
                              </a>
                            </h3>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyUrl(result.url)}
                                    className="ml-2 h-8 w-8 p-0 hover:bg-green-500/10"
                                  >
                                    <Copy className="h-4 w-4 text-green-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy URL for Brand Placement Scout</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

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

            <TabsContent value="advanced" className="space-y-8">
              {/* Advanced Search for Anonymous Users */}
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    <div className="lg:col-span-2">
                      <h2 className="text-2xl font-semibold mb-2 text-foreground">
                        Advanced SiteSearch
                      </h2>
                      <p className="text-muted-foreground mb-4">
                        Use powerful search operators like AND, OR, exact phrases, and exclude terms. 
                        Sign in to unlock search history and CSV downloads.
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Settings className="h-4 w-4 text-primary" />
                          <span>Advanced search operators</span>
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

              {/* Advanced Search Form for Anonymous Users */}
              <AdvancedSearchForm 
                onSubmit={onAdvancedSubmit}
                isLoading={advancedSearchMutation.isPending}
              />

              {/* Advanced Search Results for Anonymous Users */}
              {advancedSearchMutation.isPending && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center space-x-3 py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-muted-foreground">Processing advanced search...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {searchResults.length > 0 && !advancedSearchMutation.isPending && queryInfo && (
                <div className="space-y-6">
                  {/* Search Stats with upgrade prompt */}
                  <div className="flex items-center justify-between bg-card rounded-lg border border-border p-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-muted-foreground">Advanced search results</span>
                      <div className="text-sm text-muted-foreground">
                        <span>{searchResults.length}</span> results found in <span>{searchTime}s</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open('https://chatgpt.com/g/g-687a991a6b648191a27b5c3c4a7c40a8', '_blank')}
                              className="flex items-center space-x-2 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20 hover:border-green-500/40 transition-all"
                            >
                              <Target className="h-4 w-4 text-green-500" />
                              <span>Find Brand Placements</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Analyze search results with AI to find natural brand placement opportunities</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = "/api/login"}
                        className="flex items-center space-x-2"
                      >
                        <LogIn className="h-4 w-4" />
                        <span>Sign in for CSV</span>
                      </Button>
                    </div>
                  </div>

                  {/* Query Information */}
                  <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-sm">
                        <Settings className="h-4 w-4 text-blue-500" />
                        <span>Query Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Generated Query:</p>
                        <code className="text-xs bg-muted p-2 rounded block break-all">{queryInfo.query}</code>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Search Operators:</p>
                        <div className="flex flex-wrap gap-1">
                          {queryInfo.operators.map((operator: string, index: number) => (
                            <span key={index} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                              {operator}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Description:</p>
                        <p className="text-xs text-muted-foreground">{queryInfo.description}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Results List */}
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <Card key={index} className="hover:border-primary/20 transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="text-lg font-semibold hover:text-primary cursor-pointer transition-colors flex-1">
                                <a href={result.url} target="_blank" rel="noopener noreferrer">
                                  {result.title}
                                </a>
                              </h3>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyUrl(result.url)}
                                      className="ml-2 h-8 w-8 p-0 hover:bg-green-500/10"
                                    >
                                      <Copy className="h-4 w-4 text-green-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy URL for Brand Placement Scout</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

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
          </Tabs>
        )}
      </main>

      {/* How to Guide Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 bg-accent/20">
        <div className="space-y-12">
          {/* Introduction */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">How to Use SiteSearch</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              SiteSearch helps you find specific content within any website. Perfect for competitive research, 
              link building opportunities, content gap analysis, and brand monitoring.
            </p>
          </div>

          {/* Quick Start */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>Quick Start</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Basic Search</h4>
                  <p className="text-sm text-muted-foreground">
                    Use Basic Search for simple keyword searches within a specific domain. 
                    Perfect for finding mentions, topics, or content themes.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Advanced Search</h4>
                  <p className="text-sm text-muted-foreground">
                    Use Advanced Search for complex queries with AND/OR operators, exact phrases, 
                    exclusions, and file type filtering.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <div className="space-y-8">
            <h3 className="text-2xl font-semibold text-center text-foreground">Common Use Cases & Examples</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Link Building & Outreach */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <ExternalLink className="h-5 w-5 text-blue-500" />
                    <span>Link Building & Outreach</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Find link insertion opportunities</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      "Does [domain] have any pages that would be relevant to [my brand] and a good fit for a link insertion?"
                    </p>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">✓ Basic Search</p>
                      <p className="text-xs text-muted-foreground">Domain: <code className="bg-background px-1 rounded">publisher.com</code></p>
                      <p className="text-xs text-muted-foreground">Keywords: <code className="bg-background px-1 rounded">marketing automation CRM</code></p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Find guest posting opportunities</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Look for sites that accept guest contributors in your niche.
                    </p>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">✓ Basic Search</p>
                      <p className="text-xs text-muted-foreground">Domain: <code className="bg-background px-1 rounded">industry-blog.com</code></p>
                      <p className="text-xs text-muted-foreground">Keywords: <code className="bg-background px-1 rounded">guest post contribute author</code></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Competitive Research */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Target className="h-5 w-5 text-green-500" />
                    <span>Competitive Research</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Find competitor mentions</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      "Does [domain] mention [competitor brand] on any of their pages?"
                    </p>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">✓ Basic Search</p>
                      <p className="text-xs text-muted-foreground">Domain: <code className="bg-background px-1 rounded">industry-site.com</code></p>
                      <p className="text-xs text-muted-foreground">Keywords: <code className="bg-background px-1 rounded">HubSpot Salesforce</code></p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Find content gaps</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      "Does [domain] have pages mentioning [competitor] but not [my brand]?"
                    </p>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">✓ Advanced Search</p>
                      <p className="text-xs text-muted-foreground">Domain: <code className="bg-background px-1 rounded">review-site.com</code></p>
                      <p className="text-xs text-muted-foreground">All of these words: <code className="bg-background px-1 rounded">Slack</code></p>
                      <p className="text-xs text-muted-foreground">Exclude these words: <code className="bg-background px-1 rounded">"Microsoft Teams"</code></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Brand Monitoring */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Search className="h-5 w-5 text-purple-500" />
                    <span>Brand Monitoring</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Monitor brand mentions</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Track what others are saying about your brand across specific domains.
                    </p>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">✓ Basic Search</p>
                      <p className="text-xs text-muted-foreground">Domain: <code className="bg-background px-1 rounded">reddit.com</code></p>
                      <p className="text-xs text-muted-foreground">Keywords: <code className="bg-background px-1 rounded">"YourBrand" review experience</code></p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Find product comparisons</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Discover how your product is being compared to competitors.
                    </p>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">✓ Advanced Search</p>
                      <p className="text-xs text-muted-foreground">Domain: <code className="bg-background px-1 rounded">comparison-site.com</code></p>
                      <p className="text-xs text-muted-foreground">Any of these words: <code className="bg-background px-1 rounded">vs versus compared comparison</code></p>
                      <p className="text-xs text-muted-foreground">All of these words: <code className="bg-background px-1 rounded">YourBrand</code></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Content Research */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <FileText className="h-5 w-5 text-orange-500" />
                    <span>Content Research</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Find content templates</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Discover how successful sites structure their content around specific topics.
                    </p>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">✓ Advanced Search</p>
                      <p className="text-xs text-muted-foreground">Domain: <code className="bg-background px-1 rounded">successful-blog.com</code></p>
                      <p className="text-xs text-muted-foreground">Exact phrase: <code className="bg-background px-1 rounded">"ultimate guide to"</code></p>
                      <p className="text-xs text-muted-foreground">Any of these words: <code className="bg-background px-1 rounded">SEO marketing strategy</code></p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Find resource pages</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Locate resource and tools pages for potential link opportunities.
                    </p>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">✓ Basic Search</p>
                      <p className="text-xs text-muted-foreground">Domain: <code className="bg-background px-1 rounded">authority-site.com</code></p>
                      <p className="text-xs text-muted-foreground">Keywords: <code className="bg-background px-1 rounded">resources tools recommended links</code></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Advanced Search Operators Guide */}
          <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-blue-500" />
                <span>Advanced Search Operators Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">All of these words</h4>
                    <p className="text-sm text-muted-foreground">
                      Find pages containing ALL specified terms (AND operator)
                    </p>
                    <code className="text-xs bg-background p-1 rounded block">marketing automation CRM</code>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Any of these words</h4>
                    <p className="text-sm text-muted-foreground">
                      Find pages containing ANY of the specified terms (OR operator)
                    </p>
                    <code className="text-xs bg-background p-1 rounded block">tutorial guide walkthrough</code>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Exact phrase</h4>
                    <p className="text-sm text-muted-foreground">
                      Find pages containing the exact phrase in quotes
                    </p>
                    <code className="text-xs bg-background p-1 rounded block">"best practices for SEO"</code>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Exclude these words</h4>
                    <p className="text-sm text-muted-foreground">
                      Remove pages containing specified terms (NOT operator)
                    </p>
                    <code className="text-xs bg-background p-1 rounded block">pricing free trial</code>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">File type</h4>
                    <p className="text-sm text-muted-foreground">
                      Search for specific file types (PDF, DOC, etc.)
                    </p>
                    <code className="text-xs bg-background p-1 rounded block">pdf</code>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Date range</h4>
                    <p className="text-sm text-muted-foreground">
                      Filter results by publication date
                    </p>
                    <code className="text-xs bg-background p-1 rounded block">Past month, week, year</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pro Tips */}
          <Card className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-500" />
                <span>Pro Tips for Better Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">✓ Be Specific</h4>
                  <p className="text-sm text-muted-foreground">
                    Use specific brand names, product names, or technical terms for more targeted results.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">✓ Use Synonyms</h4>
                  <p className="text-sm text-muted-foreground">
                    Include variations and synonyms in "Any of these words" to capture different phrasings.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">✓ Combine Operators</h4>
                  <p className="text-sm text-muted-foreground">
                    Mix different operators for complex searches (e.g., exact phrase + exclude terms).
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">✓ Check Domain Format</h4>
                  <p className="text-sm text-muted-foreground">
                    Enter domains without "http://" or "www" (e.g., example.com, not www.example.com).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-2">
          <div className="flex items-center justify-center space-x-2">
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
              {' '}with{' '}
              <a 
                href="https://replit.com/refer/lunaris-tanner" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground/80 hover:text-muted-foreground transition-colors"
              >
                Replit
              </a>
            </p>
            <img 
              src="/replit.png" 
              alt="Replit" 
              className="h-4 w-4 opacity-60"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}