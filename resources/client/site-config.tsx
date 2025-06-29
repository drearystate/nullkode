import {SiteConfigContextValue} from '@common/core/settings/site-config-context';
import {message} from '@common/i18n/message';
import dashboardTopImage from '@app/admin/verts/dashboard-top.webp';
import dashboardBottomImage from '@app/admin/verts/dashboard-bottom.webp';

export const SiteConfig: Partial<SiteConfigContextValue> = {
  auth: {
    redirectUri: '/dashboard',
    adminRedirectUri: '/admin',
  },
  homepage: {
    options: [
      {
        label: message('Landing page'),
        value: 'landingPage',
      },
    ],
  },
  admin: {
    ads: [
      {
        slot: 'ads.dashboard_top',
        description: message(
          'This ad will appear at the top of user dashboard.',
        ),
        image: dashboardTopImage,
      },
      {
        slot: 'ads.dashboard_bottom',
        description: message(
          'This ad will appear at the bottom of user dashboard.',
        ),
        image: dashboardBottomImage,
      },
    ],
  },
};
