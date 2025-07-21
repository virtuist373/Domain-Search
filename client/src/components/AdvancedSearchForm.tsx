import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Globe, Search, Plus, Minus, Quote, Filter, Calendar, FileText, Languages, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { advancedSearchQuerySchema, type AdvancedSearchQuery } from "@shared/schema";

interface AdvancedSearchFormProps {
  onSubmit: (data: AdvancedSearchQuery) => void;
  isLoading: boolean;
  loadedSearchData?: AdvancedSearchQuery;
  onFormDataChange?: (data: AdvancedSearchQuery) => void;
}

export default function AdvancedSearchForm({ onSubmit, isLoading, loadedSearchData, onFormDataChange }: AdvancedSearchFormProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const form = useForm<AdvancedSearchQuery>({
    resolver: zodResolver(advancedSearchQuerySchema),
    defaultValues: {
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

  // Load search data when provided
  React.useEffect(() => {
    if (loadedSearchData) {
      form.reset(loadedSearchData);
      setIsAdvancedOpen(true); // Open advanced options when loading saved search
    }
  }, [loadedSearchData, form]);

  // Notify parent when form data changes
  const formData = form.watch();
  React.useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(formData);
    }
  }, [formData, onFormDataChange]);

  const handleSubmit = (data: AdvancedSearchQuery) => {
    // Clean up empty fields
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value && typeof value === 'string' && value.trim() !== "") {
        (acc as any)[key] = value;
      } else if (typeof value !== 'string' && value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as AdvancedSearchQuery);
    
    onSubmit(cleanData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="h-5 w-5" />
          <span>Advanced Search</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Domain Field */}
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Domain (Required)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example.com"
                      className="pr-10"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter domain without protocol (e.g., github.com)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced Options Collapsible */}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  type="button"
                >
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span>Advanced Search Options</span>
                  </div>
                  {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-6">
                {/* Search Terms Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center space-x-2">
                    <Search className="h-4 w-4" />
                    <span>Search Terms</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="allOfTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2 text-xs">
                            <Plus className="h-3 w-3" />
                            <span>All of these words</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="word1 word2 word3"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            All words must appear (AND logic)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="anyOfTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2 text-xs">
                            <Search className="h-3 w-3" />
                            <span>Any of these words</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="word1 word2 word3"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            At least one word must appear (OR logic)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="exactPhrase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2 text-xs">
                            <Quote className="h-3 w-3" />
                            <span>Exact phrase</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="exact phrase here"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Find this exact phrase
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="excludeTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2 text-xs">
                            <Minus className="h-3 w-3" />
                            <span>Exclude these words</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="word1 word2 word3"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Pages must not contain these words
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="includeTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2 text-xs">
                          <Search className="h-3 w-3" />
                          <span>Include these terms</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="additional terms to include"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Additional terms to include in search
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Filters Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="fileType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2 text-xs">
                            <FileText className="h-3 w-3" />
                            <span>File Type</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Any file type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="any">Any file type</SelectItem>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="doc">DOC</SelectItem>
                              <SelectItem value="docx">DOCX</SelectItem>
                              <SelectItem value="ppt">PPT</SelectItem>
                              <SelectItem value="pptx">PPTX</SelectItem>
                              <SelectItem value="xls">XLS</SelectItem>
                              <SelectItem value="xlsx">XLSX</SelectItem>
                              <SelectItem value="txt">TXT</SelectItem>
                              <SelectItem value="csv">CSV</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2 text-xs">
                            <Calendar className="h-3 w-3" />
                            <span>Date Range</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Any time" />
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
                          <FormLabel className="flex items-center space-x-2 text-xs">
                            <MapPin className="h-3 w-3" />
                            <span>Region</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="United States" />
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
                              <SelectItem value="in">India</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button 
                type="submit" 
                className="px-8 py-2 font-medium flex items-center space-x-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Advanced Search</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}