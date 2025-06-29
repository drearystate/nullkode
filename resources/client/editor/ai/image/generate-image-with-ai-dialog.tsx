import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {Form} from '@common/ui/forms/form';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {message} from '@common/i18n/message';
import {useForm, useFormContext} from 'react-hook-form';
import {
  GenerateImageWithAiPayload,
  useGenerateImageWithAi,
} from '@app/editor/ai/image/use-generate-image-with-ai';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {useTrans} from '@common/i18n/use-trans';
import photoImage from '@app/editor/ai/image/photo.svg';
import {SvgImage} from '@common/ui/images/svg-image/svg-image';
import {Skeleton} from '@common/ui/skeleton/skeleton';
import {useSettings} from '@common/core/settings/use-settings';
import {ButtonBase} from '@common/ui/buttons/button-base';
import clsx from 'clsx';
import {FormSelect} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {Button} from '@common/ui/buttons/button';
import {AiIcon} from '@app/editor/ai/ai-icon';
import {useUploadAiGeneratedImage} from '@app/editor/ai/image/use-upload-ai-generated-image';
import {OverImageTokenQuotaMessage} from '@app/editor/ai/image/over-image-token-quota-message';
import {useAccountUsage} from '@app/editor/use-account-usage';

const styles = [
  'none',
  'realistic',
  'watercolor',
  'photo',
  'minimalist',
  'dreamy',
  'anime',
  'psychedelic',
  'vibrant',
  '3d',
  'color-pencil',
  'playful',
];

export function GenerateImageWithAiDialog() {
  const {formId} = useDialogContext();
  const form = useForm<GenerateImageWithAiPayload>({
    defaultValues: {
      style: 'none',
      size: '1024x1024',
    },
  });
  const generateImage = useGenerateImageWithAi(form);

  return (
    <Dialog size="fullscreen" className="h-full w-full">
      <DialogHeader
        showDivider
        titleTextSize="text-sm"
        titleFontWeight="font-bold"
      >
        <Trans message="AI image creator" />
      </DialogHeader>
      <DialogBody padding="p-0">
        <Form
          className="h-full"
          id={formId}
          form={form}
          onSubmit={data => {
            generateImage.mutate(data);
          }}
        >
          <div className="flex h-full items-center">
            <Sidebar
              isGenerating={generateImage.isPending}
              generatedImageUrl={generateImage.data?.url}
            />
            <PreviewPanel mutation={generateImage} />
          </div>
        </Form>
      </DialogBody>
    </Dialog>
  );
}

interface SidebarProps {
  generatedImageUrl?: string;
  isGenerating: boolean;
}
function Sidebar({generatedImageUrl, isGenerating}: SidebarProps) {
  const {close} = useDialogContext();
  const {trans} = useTrans();
  const {data: usage} = useAccountUsage();
  const uploadGeneratedImage = useUploadAiGeneratedImage();
  const handleUploadGeneratedImage = () => {
    if (generatedImageUrl) {
      uploadGeneratedImage.mutate(
        {
          url: generatedImageUrl,
        },
        {
          onSuccess: response => {
            close(response.fileEntry.url);
          },
        },
      );
    }
  };
  return (
    <aside className="flex h-full w-375 flex-shrink-0 flex-col overflow-y-auto border-r p-24">
      <div className="flex-auto">
        <FormTextField
          label={<Trans message="Describe your image" />}
          name="prompt"
          inputElementType="textarea"
          rows={6}
          placeholder={trans(
            message('e.g., Beautiful abstract tech background'),
          )}
          autoFocus
        />
        <StyleSelector />
        <AspectRatioSelector />
        <OverImageTokenQuotaMessage />
      </div>
      <div className="mt-24 flex-shrink-0">
        <Button
          color="primary"
          variant="outline"
          className="mb-14 min-h-44 w-full"
          disabled={!generatedImageUrl || uploadGeneratedImage.isPending}
          onClick={() => handleUploadGeneratedImage()}
        >
          <Trans message="Use image" />
        </Button>
        <Button
          type="submit"
          startIcon={<AiIcon />}
          color="primary"
          variant="flat"
          className="min-h-44 w-full"
          disabled={isGenerating || !!usage?.ai.images.failReason}
        >
          <Trans message="Generate" />
        </Button>
      </div>
    </aside>
  );
}

function StyleSelector() {
  const {base_url} = useSettings();
  const form = useFormContext<GenerateImageWithAiPayload>();
  const value = form.watch('style');

  return (
    <div className="mt-24">
      <div className="mb-4 text-sm">
        <Trans message="Choose a style" />
      </div>
      <div className="grid grid-cols-4 gap-8">
        {styles.map(style => {
          const imageClassName = clsx(
            'block h-full w-full rounded-panel border-2 object-cover',
            value === style && 'border-primary/90',
          );
          return (
            <div
              key={style}
              className="cursor-pointer"
              onClick={() => form.setValue('style', style)}
            >
              <ButtonBase className="aspect-square w-full">
                {style === 'none' ? (
                  <div className={clsx(imageClassName, 'diagonal-lines')}></div>
                ) : (
                  <img
                    className={imageClassName}
                    src={`${base_url}/images/ai/${style}.webp`}
                    alt={style}
                  />
                )}
              </ButtonBase>
              <div
                className={clsx(
                  'mt-4 overflow-hidden overflow-ellipsis whitespace-nowrap text-center text-xs capitalize',
                  value === style && 'text-primary',
                )}
              >
                {style}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AspectRatioSelector() {
  return (
    <FormSelect
      name="size"
      label={<Trans message="Aspect ratio" />}
      selectionMode="single"
      className="mt-24"
    >
      <Item value="1024x1024">
        <Trans message="Square" />
      </Item>
      <Item value="1792x1024">
        <Trans message="Landscape" />
      </Item>
      <Item value="1024x1792">
        <Trans message="Portrait" />
      </Item>
    </FormSelect>
  );
}

interface PreviewPanelProps {
  mutation: ReturnType<typeof useGenerateImageWithAi>;
}
function PreviewPanel({mutation}: PreviewPanelProps) {
  const imageSize = mutation.data?.size || '1024x1024';
  const aspectRatio = `${imageSize.replace('x', '/')}`;
  return (
    <div className="flex h-full flex-auto flex-col items-center justify-center bg-alt px-36 pb-6 pt-36">
      <div
        style={{aspectRatio}}
        className="flex flex-auto items-center justify-center overflow-hidden rounded-panel border-3 border-white shadow"
      >
        <ImagePreview mutation={mutation} />
      </div>
      <div className="flex-shrink-0 pt-24 text-center text-xs text-muted">
        <Trans message="Make sure you don’t enter any personal information and double-check that you have the right to use the content created by AI." />
      </div>
    </div>
  );
}

interface ImagePreviewProps {
  mutation: ReturnType<typeof useGenerateImageWithAi>;
}
function ImagePreview({mutation}: ImagePreviewProps) {
  if (mutation.isPending) {
    return <Skeleton variant="rect" className="rounded-panel" />;
  }

  if (mutation.data?.url) {
    return (
      <img
        src={mutation.data.url}
        alt="Generated image"
        className="overflow-hidden rounded-panel object-cover"
      />
    );
  }

  return <SvgImage src={photoImage} height="h-84" />;
}
