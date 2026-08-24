

export type QueryResults = {
  headers: string[];
  content: string[][];
  number: number;
  numberOfElements: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasContent: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  firstPage: boolean;
  lastPage: boolean;
};

export type QuerySuccess = {
  queryId: string;
  query: string;
  explanation: string;
  results: QueryResults;
};

export type QueryStage =
  | "auth"
  | "rate_limit"
  | "input"
  | "groq"
  | "validation"
  | "wca";

export type QueryFailure = {
  stage: QueryStage;
  error: string;

  query?: string;
  retryAfter?: number;
};
