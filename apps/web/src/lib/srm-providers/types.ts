import { SrmProviderType, SrmAuthType, SrmIntegration } from '@ems/database';
import { JiraFieldMappingConfig, JiraIssueData } from '../jira-service';

export interface SrmTestConnectionResult {
  success: boolean;
  message: string;
  statusCode?: number;
  sampleCount?: number;
  sampleItem?: any;
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
  fetchIssues(integration: SrmIntegration): Promise<any[]>;
  getMetadata(): SrmProviderMetadata;
}
