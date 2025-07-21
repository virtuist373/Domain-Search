import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { SavedSearch, AdvancedSearchQuery } from "@shared/schema";
import { Star, Search, Edit, Trash2, Play, Plus } from "lucide-react";

const saveSearchSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  domain: z.string().min(1, "Domain is required"),
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

type SaveSearchForm = z.infer<typeof saveSearchSchema>;

interface SavedSearchesProps {
  onLoadSearch: (searchData: AdvancedSearchQuery) => void;
  currentSearch?: AdvancedSearchQuery;
}

export default function SavedSearches({ onLoadSearch, currentSearch }: SavedSearchesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const { toast } = useToast();

  const { data: savedSearches = [], isLoading } = useQuery<SavedSearch[]>({
    queryKey: ["/api/saved-searches"],
    retry: false,
  });

  const form = useForm<SaveSearchForm>({
    resolver: zodResolver(saveSearchSchema),
    defaultValues: {
      name: "",
      domain: "",
      includeTerms: "",
      excludeTerms: "",
      exactPhrase: "",
      anyOfTerms: "",
      allOfTerms: "",
      fileType: "",
      dateRange: "any",
      language: "",
      region: "us",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SaveSearchForm) => {
      return await apiRequest("/api/saved-searches", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-searches"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Search Saved",
        description: "Your search has been saved to favorites.",
      });
    },
    onError: (error) => {
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
        title: "Error",
        description: "Failed to save search. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SaveSearchForm> }) => {
      return await apiRequest(`/api/saved-searches/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-searches"] });
      setEditingSearch(null);
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Search Updated",
        description: "Your saved search has been updated.",
      });
    },
    onError: (error) => {
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
        title: "Error",
        description: "Failed to update search. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/saved-searches/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-searches"] });
      toast({
        title: "Search Deleted",
        description: "Your saved search has been deleted.",
      });
    },
    onError: (error) => {
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
        title: "Error",
        description: "Failed to delete search. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveCurrentSearch = () => {
    if (currentSearch) {
      form.reset({
        name: "",
        domain: currentSearch.domain,
        includeTerms: currentSearch.includeTerms || "",
        excludeTerms: currentSearch.excludeTerms || "",
        exactPhrase: currentSearch.exactPhrase || "",
        anyOfTerms: currentSearch.anyOfTerms || "",
        allOfTerms: currentSearch.allOfTerms || "",
        fileType: currentSearch.fileType || "",
        dateRange: (currentSearch.dateRange as "any" | "day" | "week" | "month" | "year") || "any",
        language: currentSearch.language || "",
        region: currentSearch.region || "us",
      });
      setEditingSearch(null);
      setIsDialogOpen(true);
    }
  };

  const handleEditSearch = (search: SavedSearch) => {
    form.reset({
      name: search.name,
      domain: search.domain,
      includeTerms: search.includeTerms || "",
      excludeTerms: search.excludeTerms || "",
      exactPhrase: search.exactPhrase || "",
      anyOfTerms: search.anyOfTerms || "",
      allOfTerms: search.allOfTerms || "",
      fileType: search.fileType || "",
      dateRange: (search.dateRange as "any" | "day" | "week" | "month" | "year") || "any",
      language: search.language || "",
      region: search.region || "us",
    });
    setEditingSearch(search);
    setIsDialogOpen(true);
  };

  const handleLoadSearch = (search: SavedSearch) => {
    const searchData: AdvancedSearchQuery = {
      domain: search.domain,
      includeTerms: search.includeTerms || "",
      excludeTerms: search.excludeTerms || "",
      exactPhrase: search.exactPhrase || "",
      anyOfTerms: search.anyOfTerms || "",
      allOfTerms: search.allOfTerms || "",
      fileType: search.fileType || "",
      dateRange: search.dateRange as any || "any",
      language: search.language || "",
      region: search.region || "us",
    };
    onLoadSearch(searchData);
  };

  const onSubmit = (data: SaveSearchForm) => {
    if (editingSearch) {
      updateMutation.mutate({ id: editingSearch.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>Saved Searches</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {currentSearch && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveCurrentSearch}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Save Current</span>
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.reset();
                    setEditingSearch(null);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>New</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingSearch ? "Edit Saved Search" : "Save New Search"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Search Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My favorite search" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain</FormLabel>
                            <FormControl>
                              <Input placeholder="example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fileType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>File Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Any file type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Any file type</SelectItem>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="doc">DOC</SelectItem>
                                <SelectItem value="docx">DOCX</SelectItem>
                                <SelectItem value="xls">XLS</SelectItem>
                                <SelectItem value="xlsx">XLSX</SelectItem>
                                <SelectItem value="ppt">PPT</SelectItem>
                                <SelectItem value="pptx">PPTX</SelectItem>
                                <SelectItem value="txt">TXT</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="allOfTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>All of these words</FormLabel>
                            <FormControl>
                              <Input placeholder="word1 word2 word3" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="anyOfTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Any of these words</FormLabel>
                            <FormControl>
                              <Input placeholder="word1 word2 word3" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="exactPhrase"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exact phrase</FormLabel>
                            <FormControl>
                              <Input placeholder="exact phrase here" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="excludeTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exclude these words</FormLabel>
                            <FormControl>
                              <Input placeholder="word1 word2 word3" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dateRange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date Range</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="any">Any time</SelectItem>
                                <SelectItem value="day">Past 24 hours</SelectItem>
                                <SelectItem value="week">Past week</SelectItem>
                                <SelectItem value="month">Past month</SelectItem>
                                <SelectItem value="year">Past year</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="us">United States</SelectItem>
                                <SelectItem value="uk">United Kingdom</SelectItem>
                                <SelectItem value="ca">Canada</SelectItem>
                                <SelectItem value="au">Australia</SelectItem>
                                <SelectItem value="de">Germany</SelectItem>
                                <SelectItem value="fr">France</SelectItem>
                                <SelectItem value="jp">Japan</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingSearch ? "Update" : "Save"} Search
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading saved searches...
          </div>
        ) : savedSearches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No saved searches yet</p>
            <p className="text-sm">Save your favorite search configurations for quick access</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedSearches.map((search: SavedSearch) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{search.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {search.domain} • {search.allOfTerms || search.anyOfTerms || search.exactPhrase || "No terms"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLoadSearch(search)}
                    className="flex items-center space-x-1"
                  >
                    <Play className="h-4 w-4" />
                    <span>Load</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSearch(search)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(search.id)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}