import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Globe, History, Database } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Search className="text-primary h-6 w-6" />
              <h1 className="text-xl font-semibold">Domain Search</h1>
            </div>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="px-6 py-2"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Search Any Domain's Content
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find specific content within any website using targeted Google searches. 
            Save your search history and results for later review.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = "/api/login"}
            className="px-8 py-3 text-lg"
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardContent className="p-8 text-center">
              <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Domain-Specific Search</h3>
              <p className="text-muted-foreground">
                Target your searches to specific domains and find exactly what you're looking for.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8 text-center">
              <History className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Search History</h3>
              <p className="text-muted-foreground">
                Keep track of all your searches and easily revisit previous results.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8 text-center">
              <Database className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Save Results</h3>
              <p className="text-muted-foreground">
                Your search results are automatically saved for future reference and analysis.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold mb-4">
                Ready to Start Searching?
              </h2>
              <p className="text-muted-foreground mb-6">
                Sign in to save your search history and access all features.
              </p>
              <Button 
                size="lg" 
                onClick={() => window.location.href = "/api/login"}
                className="px-8 py-3"
              >
                Sign In Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}