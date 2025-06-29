import './app.css';
import React from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {CommonProvider} from '@common/core/common-provider';
import * as Sentry from '@sentry/react';
import {rootEl} from '@common/core/root-el';
import {getBootstrapData} from '@common/core/bootstrap-data/use-backend-bootstrap-data';
import {ignoredSentryErrors} from '@common/errors/ignored-sentry-errors';
import {AppRoutes} from '@app/app-routes';
import {BrowserRouter} from 'react-router-dom';
import {FetchCustomPageResponse} from '@common/custom-page/use-custom-page';
import {FtpCredentials} from '@app/dashboard/project';
import {LandingPageContent} from '@app/landing/landing-page-content';

declare module '@common/http/value-lists' {
  interface FetchValueListsResponse {
    //
  }
}

declare module '@common/core/bootstrap-data/bootstrap-data' {
  interface BootstrapData {
    loaders?: {
      landingPage?: any;
      customPage?: FetchCustomPageResponse;
    };
  }
}

declare module '@common/core/settings/settings' {
  interface Settings {
    ai_setup: boolean;
    publish?: {
      default_credentials?: FtpCredentials;
      allow_credential_change?: boolean;
    };
    builder?: {
      template_categories?: string[];
      enable_subdomains?: boolean;
      enable_custom_domains?: boolean;
    };
    homepage?: {
      type?: string;
      value?: string;
      appearance: LandingPageContent;
    };
    ads?: {
      dashboard_top?: string;
      dashboard_bottom?: string;
      disable?: boolean;
    };
  }
}

declare module '@common/auth/user' {
  interface User {
    //
  }
}

const data = getBootstrapData();
const sentryDsn = data.settings.logging.sentry_public;
if (sentryDsn && import.meta.env.PROD) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 0.2,
    ignoreErrors: ignoredSentryErrors,
    release: data.sentry_release,
  });
}

const app = (
  <BrowserRouter basename={data.settings.html_base_uri}>
    <CommonProvider>
      <AppRoutes />
    </CommonProvider>
  </BrowserRouter>
);

if (data.rendered_ssr) {
  hydrateRoot(rootEl, app);
} else {
  createRoot(rootEl).render(app);
}
