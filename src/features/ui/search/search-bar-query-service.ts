import { injectable } from "inversify";
import { SearchResult } from "@shared/types";

@injectable()
export class SearchBarQueryService {
  public filterResults(results: SearchResult[], rawQuery: string, maxResults: number): SearchResult[] {
    const query = rawQuery.toLowerCase().trim();
    if (!query) {
      return [];
    }

    return results
      .filter((result) => this.matchesQuery(result, query))
      .slice(0, maxResults);
  }

  private matchesQuery(result: SearchResult, query: string): boolean {
    const nameMatch = result.name.toLowerCase().includes(query);
    const typeMatch = result.type.toLowerCase().includes(query);
    const floorMatch = typeof result.floor === 'number' && result.floor.toString().includes(query);
    const idMatch = result.id.toLowerCase().includes(query);

    return nameMatch || typeMatch || floorMatch || idMatch;
  }
}
