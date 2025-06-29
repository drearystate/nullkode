import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {editorState} from '@app/editor/state/editor-store';
import {ReplaceNodeContent} from '@app/editor/mutations/dom/replace-node-content';
import {Button} from '@common/ui/buttons/button';
import {AiIcon} from '@app/editor/ai/ai-icon';
import {Trans} from '@common/i18n/trans';
import {GenerateTextWithAiDialog} from '@app/editor/ai/text/generate-text-with-ai-dialog';
import {ReactElement} from 'react';
import {isAbsoluteUrl} from '@common/utils/urls/is-absolute-url';
import {getBootstrapData} from '@common/core/bootstrap-data/use-backend-bootstrap-data';
import {ModifyAttributes} from '@app/editor/mutations/attributes/modify-attributes';
import {HoveredElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {GenerateImageWithAiDialog} from '@app/editor/ai/image/generate-image-with-ai-dialog';
import {IconButton} from '@common/ui/buttons/icon-button';
import {LockIcon} from '@common/icons/material/Lock';
import {UpgradeDialog} from '@common/billing/upgrade/upgrade-dialog';
import {useAccountUsage} from '@app/editor/use-account-usage';
import {useSettings} from '@common/core/settings/use-settings';
import {mutationState} from '@app/editor/state/mutation-store';

interface AiActionButtonProps {
  name: string;
}

const replaceTextAction = (text: string) => {
  const node = editorState().selectedContext?.node;
  if (text && node) {
    mutationState().executeMutation(
      new ReplaceNodeContent(node, node.innerHTML, text),
      {
        lastInSession: true,
      },
    );
  }
};

const replaceImageSrcAction = (imageUrl: string) => {
  const node = editorState().selectedContext?.node;
  if (imageUrl && node) {
    const absoluteUrl = isAbsoluteUrl(imageUrl)
      ? imageUrl
      : `${getBootstrapData().settings.base_url}/${imageUrl}`;
    mutationState().executeMutation(
      new ModifyAttributes(node, {
        src: absoluteUrl,
      }),
      {lastInSession: true},
    );
    HoveredElementOverlay.hide();
  }
};

export const aiActionButtonHandlers = {
  replaceTextAction,
  replaceImageSrcAction,
};

export function CreateTextWithAiButton({name}: AiActionButtonProps) {
  return (
    <ButtonLayout
      name={name}
      permission="ai.text"
      onSubmit={(text: string) => replaceTextAction(text)}
    >
      <GenerateTextWithAiDialog />
    </ButtonLayout>
  );
}

export function EditTextWithAiButton({name}: AiActionButtonProps) {
  return (
    <ButtonLayout
      name={name}
      permission="ai.text"
      onSubmit={(text: string) => replaceTextAction(text)}
    >
      <GenerateTextWithAiDialog
        initialScreen={() => ({
          name: 'refine',
          originalText: editorState().selectedContext?.node.textContent ?? '',
        })}
      />
    </ButtonLayout>
  );
}

export function CreateImageWithAiButton({name}: AiActionButtonProps) {
  return (
    <ButtonLayout
      name={name}
      permission="ai.image"
      onSubmit={(imgUrl: string) => replaceImageSrcAction(imgUrl)}
    >
      <GenerateImageWithAiDialog />
    </ButtonLayout>
  );
}

interface ButtonLayoutProps {
  name: string;
  permission: string;
  children: ReactElement;
  onSubmit: (value: any) => void;
}
function ButtonLayout({
  name,
  permission,
  children,
  onSubmit,
}: ButtonLayoutProps) {
  const {data} = useAccountUsage();
  const {billing, ai_setup} = useSettings();
  const hasPermission =
    permission === 'ai.text'
      ? data?.ai.text.hasPermission
      : data?.ai.images.hasPermission;

  if (!ai_setup) return null;

  return (
    <div>
      <DialogTrigger
        type="modal"
        onClose={value => {
          if (value) {
            onSubmit(value);
          }
        }}
      >
        <Button
          variant="outline"
          color="primary"
          disabled={!hasPermission}
          startIcon={<AiIcon />}
          size="xs"
        >
          <Trans message={name} />
        </Button>
        {children}
      </DialogTrigger>
      {!hasPermission && billing.enable && <UpgradeButton />}
    </div>
  );
}

function UpgradeButton() {
  return (
    <DialogTrigger type="popover">
      <IconButton className="ml-2 text-muted" size="xs">
        <LockIcon />
      </IconButton>
      <UpgradeDialog
        message={<Trans message="Upgrade to unlock AI and other features." />}
      />
    </DialogTrigger>
  );
}
