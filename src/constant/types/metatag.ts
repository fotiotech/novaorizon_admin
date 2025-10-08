// types/metatag.ts
export interface MetaTagUrl {
  _id?: string;
  url: string;
  urlPattern?: string;
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product' | 'profile' | 'video';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  robots?: string;
  priority: number;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  isActive: boolean;
  lastModified: Date;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MetaTagFormData {
  url: string;
  urlPattern?: string;
  title: string;
  description: string;
  keywords: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  robots?: string;
  priority: number;
  changeFrequency: string;
  isActive: boolean;
}

export interface MetaTagResponse {
  success: boolean;
  data?: MetaTagUrl;
  error?: string;
}

export interface MetaTagListResponse {
  success: boolean;
  data: MetaTagUrl[];
  total: number;
  page: number;
  limit: number;
}