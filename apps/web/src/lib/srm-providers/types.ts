import { SrmProviderType, SrmAuthType, SrmIntegration } from '@ems/database';
import { JiraFieldMappingConfig } from '../jira-service';

export interface SrmAuthConfig {
  password?: string;
  apiToken?: string;
  apiKey?: string;
  token?: string;
  username?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface SrmQueryConfig {
  endpoint?: string;
  testEndpoint?: string;
  projectKey?: string;
  projectId?: string | number;
  issuesPath?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface SrmTestConnectionResult {
  success: boolean;
  message: string;
  statusCode?: number;
  sampleCount?: number;
  sampleItem?: Record<string, unknown> | null;
  diagnostics?: string[];
}

export interface SrmProviderMetadata {
  type: SrmProviderType;
  name: string;
  description: string;
  icon: string;
  defaultEndpoint: string;
  defaultAuthType: SrmAuthType;
  defaultHeaders: Record<string, string>;
  defaultMapping: Partial<JiraFieldMappingConfig>;
}

export interface ISrmProviderAdapter {
  readonly providerType: SrmProviderType;
  testConnection(integration: SrmIntegration): Promise<SrmTestConnectionResult>;
  fetchIssues(integration: SrmIntegration): Promise<Record<string, unknown>[]>;
  getMetadata(): SrmProviderMetadata;
}
