import {CustomDomain} from '@common/custom-domains/custom-domain';
import {User} from '@common/auth/user';

export interface Project {
  id: number;
  name: string;
  slug: string;
  published: boolean;
  uuid?: string;
  template: string;
  user_id: number;
  user?: User;
  pages?: BuilderPage[];
  domain?: CustomDomain;
  settings?: {
    formsEmail?: string;
    ftpCredentials?: FtpCredentials;
  };
  created_at?: string;
  updated_at?: string;
}

export interface EditorProject {
  model: Project;
  pages: BuilderPageWithId[];
  css: string;
  js: string;
}

export interface BuilderPage {
  name: string;
  html: string;
  hiddenInPagesPanel?: boolean;
  doc?: Document;
}

export interface BuilderPageWithId extends BuilderPage {
  id: string;
}

export interface FtpCredentials {
  host?: string;
  username?: string;
  password?: string;
  directory?: string;
  port?: number;
  ssl?: boolean;
  rememberCredentials?: boolean;
}
