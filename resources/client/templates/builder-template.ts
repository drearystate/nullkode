import {BuilderPage} from '@app/dashboard/project';

export interface BuilderTemplate {
  id: string;
  name: string;
  updated_at: string;
  thumbnail: string;
  pages: BuilderPage[];
  config: BuilderTemplateConfig;
}

export interface BuilderTemplateConfig extends HtmlParserConfig {
  name: string;
  color: string;
  category: string;
  theme: string;
}

export interface HtmlParserConfig {
  includeBootstrap?: boolean;
  includeFontawesome?: boolean;
  nodesToRestore?: string[];
  classesToRemove?: string[];
}
