import {Trans} from '@common/i18n/trans';
import {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {LinkStyle} from '@common/ui/buttons/external-link';
import {PolicyFailMessage} from '@common/billing/upgrade/policy-fail-message';
import {useAccountUsage} from '@app/editor/use-account-usage';

export function OverTextTokenQuotaMessage() {
  const {data: usage} = useAccountUsage();

  if (usage?.ai.text.failReason !== 'overQuota') {
    return null;
  }

  return (
    <PolicyFailMessage
      size="sm"
      className="mt-14"
      message={
        <Trans
          message="Your plan has used all available AI text tokens. <a>Upgrade to get more.</a>"
          values={{
            a: (text: ReactNode) => (
              <Link className={LinkStyle} to="/pricing">
                {text}
              </Link>
            ),
          }}
        />
      }
    />
  );
}
