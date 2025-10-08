// types/sitemap.ts
export interface PrioritySettings {
  home: number;
  products: number;
  categories: number;
  blog: number;
  static: number;
}

export interface ExcludedUrl {
  url: string;
  pattern: string;
  reason: string;
  excludedAt: Date;
}

export interface SearchEnginePing {
  google: boolean;
  bing: boolean;
  other: boolean;
}

export interface SitemapSettings {
  _id?: string;
  autoRegenerate: boolean;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  prioritySettings: PrioritySettings;
  excludedUrls: ExcludedUrl[];
  lastGenerated?: Date;
  urlsCount?: number;
  searchEnginePing: SearchEnginePing;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SitemapLog {
  _id?: string;
  action: 'generated' | 'submitted' | 'error' | 'updated_settings';
  details: string;
  urlsCount?: number;
  duration?: number;
  error?: string;
  triggeredBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SitemapUrl {
  url: string;
  priority: number;
  changeFreq: string;
  lastMod: string;
}

export interface SitemapGenerationResult {
  success: boolean;
  urlsCount?: number;
  duration?: number;
  error?: string;
}

export interface SearchEngineSubmissionResult {
  success: boolean;
  results?: Array<{
    engine: string;
    success: boolean;
    error?: string;
  }>;
  error?: string;
}

export interface SettingsUpdateResult {
  success: boolean;
  settings?: SitemapSettings;
  error?: string;
}