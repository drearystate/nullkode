import {useSettings} from '@common/core/settings/use-settings';
import React, {Fragment} from 'react';
import {useAuth} from '@common/auth/use-auth';
import {ToastContainer} from '@common/ui/toast/toast-container';
import {AppearanceListener} from '@common/admin/appearance/commands/appearance-listener';
import {CookieNotice} from '@common/ui/cookie-notice/cookie-notice';
import {AuthRoute} from '@common/auth/guards/auth-route';
import {DynamicHomepage} from '@common/ui/dynamic-homepage';
import {FullPageLoader} from '@common/ui/progress/full-page-loader';
import {AuthRoutes} from '@common/auth/auth-routes';
import {BillingRoutes} from '@common/billing/billing-routes';
import {NotificationRoutes} from '@common/notifications/notification-routes';
import {ContactUsPage} from '@common/contact/contact-us-page';
import {CustomPageLayout} from '@common/custom-page/custom-page-layout';
import {NotFoundPage} from '@common/ui/not-found-page/not-found-page';
import {DialogStoreOutlet} from '@common/ui/overlays/store/dialog-store-outlet';
import {EmailVerificationPage} from '@common/auth/ui/email-verification-page/email-verification-page';
import {Route, Routes} from 'react-router-dom';
import {LandingPage} from '@app/landing/landing-page';
import {GuestRoute} from '@common/auth/guards/guest-route';

const DashboardRoutes = React.lazy(
  () => import('./dashboard/dashboard-routes'),
);
const EditorPage = React.lazy(() => import('@app/editor/editor-page'));
const AdminRoutes = React.lazy(() => import('@common/admin/admin-routes'));
const SwaggerApiDocs = React.lazy(
  () => import('@common/swagger/swagger-api-docs-page'),
);

export function AppRoutes() {
  const {billing, notifications, require_email_confirmation, api} =
    useSettings();
  const {user, hasPermission} = useAuth();

  if (user != null && require_email_confirmation && !user.email_verified_at) {
    return (
      <Fragment>
        <ToastContainer />
        <Routes>
          <Route path="*" element={<EmailVerificationPage />} />
        </Routes>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <AppearanceListener />
      <CookieNotice />
      <ToastContainer />
      <Routes>
        <Route
          path="/"
          element={
            <DynamicHomepage
              homepageResolver={() => (
                <GuestRoute>
                  <LandingPage />
                </GuestRoute>
              )}
            />
          }
        />
        <Route
          path="/admin/*"
          element={
            <AuthRoute permission="admin.access">
              <React.Suspense fallback={<FullPageLoader screen />}>
                <AdminRoutes />
              </React.Suspense>
            </AuthRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <AuthRoute permission="projects.create">
              <React.Suspense fallback={<FullPageLoader screen />}>
                <DashboardRoutes />
              </React.Suspense>
            </AuthRoute>
          }
        />
        <Route
          path="/editor/:projectId"
          element={
            <AuthRoute permission="projects.create">
              <React.Suspense fallback={<FullPageLoader screen />}>
                <EditorPage />
              </React.Suspense>
            </AuthRoute>
          }
        />
        {AuthRoutes}
        {billing.enable && BillingRoutes}
        {notifications.integrated && NotificationRoutes}
        {api?.integrated && hasPermission('api.access') && (
          <Route
            path="api-docs"
            element={
              <React.Suspense fallback={<FullPageLoader screen />}>
                <SwaggerApiDocs />
              </React.Suspense>
            }
          />
        )}
        <Route path="contact" element={<ContactUsPage />} />
        <Route path="pages/:pageSlug" element={<CustomPageLayout />} />
        <Route path="pages/:pageId/:pageSlug" element={<CustomPageLayout />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <DialogStoreOutlet />
    </Fragment>
  );
}
