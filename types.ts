

export enum Page {
  HOME = 'HOME',
  WORKSPACE = 'WORKSPACE',
  PROFILE = 'PROFILE'
}

export interface Paper {
  id: string;
  title: string;
  author: string;
  year: number;
  snippet: string;
}

export interface AIAnalysisResult {
  title: string;
  summary: string;
  sampleSize: string;
  methodology: string;
  keyFindings: string[];
  statisticalTests: string[];
  limitations: string[];
}

export interface RelatedPaper {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  methodology: string;
  finding: string;
  status: 'supporting' | 'conflicting' | 'related';
  statusText: string;
  url?: string;
  comparisonDetails: {
    differenceType: string;
    uploadedPaperValue: string;
    externalPaperValue: string;
    reason: string;
  };
}

export interface AIAnalysisPoint {
  id: string;
  title: string;
  type: 'population' | 'stat-test' | 'finding' | 'general';
  content: string;
}

export interface Reference {
  title: string;
  author: string;
  year: string;
}
