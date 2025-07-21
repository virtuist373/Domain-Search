import type { SearchQuery, AdvancedSearchQuery } from "@shared/schema";

export interface SearchQueryComponents {
  query: string;
  operators: string[];
  description: string;
}

/**
 * Builds Google search query from basic search parameters
 */
export function buildBasicQuery(searchParams: SearchQuery): SearchQueryComponents {
  const query = `site:${searchParams.domain} ${searchParams.keyword}`;
  return {
    query,
    operators: [`site:${searchParams.domain}`],
    description: `Searching ${searchParams.domain} for "${searchParams.keyword}"`
  };
}

/**
 * Builds advanced Google search query with operators like include, exclude, exact phrase, etc.
 */
export function buildAdvancedQuery(searchParams: AdvancedSearchQuery): SearchQueryComponents {
  const queryParts: string[] = [];
  const operators: string[] = [];
  const descriptions: string[] = [];

  // Site restriction (required)
  queryParts.push(`site:${searchParams.domain}`);
  operators.push(`site:${searchParams.domain}`);
  descriptions.push(`domain: ${searchParams.domain}`);

  // Include terms (AND logic - all terms must be present)
  if (searchParams.allOfTerms?.trim()) {
    const terms = searchParams.allOfTerms.trim().split(/\s+/);
    terms.forEach(term => {
      queryParts.push(`+${term}`);
    });
    operators.push(`ALL OF: ${searchParams.allOfTerms}`);
    descriptions.push(`must include all: ${searchParams.allOfTerms}`);
  }

  // Any of terms (OR logic - at least one term must be present)
  if (searchParams.anyOfTerms?.trim()) {
    const terms = searchParams.anyOfTerms.trim().split(/\s+/);
    const orQuery = `(${terms.join(' OR ')})`;
    queryParts.push(orQuery);
    operators.push(`ANY OF: ${searchParams.anyOfTerms}`);
    descriptions.push(`any of: ${searchParams.anyOfTerms}`);
  }

  // Exact phrase search
  if (searchParams.exactPhrase?.trim()) {
    queryParts.push(`"${searchParams.exactPhrase.trim()}"`);
    operators.push(`EXACT: "${searchParams.exactPhrase}"`);
    descriptions.push(`exact phrase: "${searchParams.exactPhrase}"`);
  }

  // Include terms (additional terms that should be present)
  if (searchParams.includeTerms?.trim()) {
    const terms = searchParams.includeTerms.trim().split(/\s+/);
    terms.forEach(term => {
      queryParts.push(term);
    });
    operators.push(`INCLUDE: ${searchParams.includeTerms}`);
    descriptions.push(`include: ${searchParams.includeTerms}`);
  }

  // Exclude terms
  if (searchParams.excludeTerms?.trim()) {
    const terms = searchParams.excludeTerms.trim().split(/\s+/);
    terms.forEach(term => {
      queryParts.push(`-${term}`);
    });
    operators.push(`EXCLUDE: ${searchParams.excludeTerms}`);
    descriptions.push(`exclude: ${searchParams.excludeTerms}`);
  }

  // File type restriction
  if (searchParams.fileType?.trim()) {
    queryParts.push(`filetype:${searchParams.fileType.trim()}`);
    operators.push(`FILETYPE: ${searchParams.fileType}`);
    descriptions.push(`file type: ${searchParams.fileType}`);
  }

  const query = queryParts.join(' ');
  const description = descriptions.join(', ');

  return {
    query,
    operators,
    description
  };
}

/**
 * Converts date range enum to search parameters for Serper API
 */
export function getDateFilterParams(dateRange?: string) {
  if (!dateRange || dateRange === 'any') {
    return {};
  }

  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return {};
  }

  return {
    tbs: `qdr:${dateRange.charAt(0)}` // Google's time-based search parameter
  };
}

/**
 * Gets language and region parameters for search API
 */
export function getLocalizationParams(language?: string, region?: string) {
  return {
    gl: region || 'us',
    hl: language || 'en'
  };
}