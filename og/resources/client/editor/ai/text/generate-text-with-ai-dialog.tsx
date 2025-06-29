import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {Button} from '@common/ui/buttons/button';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {useForm} from 'react-hook-form';
import {Form} from '@common/ui/forms/form';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {useTrans} from '@common/i18n/use-trans';
import {message} from '@common/i18n/message';
import {
  GenerateTextWithAiPayload,
  useGenerateTextWithAi,
} from '@app/editor/ai/text/use-generate-text-with-ai';
import {Fragment, useRef, useState} from 'react';
import {ButtonBase} from '@common/ui/buttons/button-base';
import {PromptSuggestionIcon} from '@app/editor/ai/prompt-suggestion-icon';
import {AiIcon} from '@app/editor/ai/ai-icon';
import {RefineAiTextScreen} from '@app/editor/ai/text/refine-ai-text-screen';
import {AiTextWarningMessage} from '@app/editor/ai/text/ai-text-warning-message';
import {AiTextLoadingIndicator} from '@app/editor/ai/text/ai-text-loading-indicator';
import {useAccountUsage} from '@app/editor/use-account-usage';
import {OverTextTokenQuotaMessage} from '@app/editor/ai/text/over-text-token-quota-message';

interface GenerateScreenData {
  name: 'generate';
}

interface RefineScreenData {
  name: 'refine';
  originalText: string;
}

const suggestedPrompts = [
  'Write a short landing page title for...',
  'Create one paragraph product page description for...',
  'Suggest a four word tagline for...',
  'Create a two paragraph service description for...',
  'Write a one sentence testimonial for...',
  'Craft a short ad copy for...',
];

interface Props {
  initialScreen?: () => GenerateScreenData | RefineScreenData;
}
export function GenerateTextWithAiDialog({initialScreen}: Props) {
  const {} = useAccountUsage();
  const [activeScreen, setActiveScreen] = useState<
    GenerateScreenData | RefineScreenData
  >(initialScreen ? initialScreen : {name: 'generate'});

  return (
    <Dialog size="lg">
      <DialogHeader
        showDivider
        titleTextSize="text-sm"
        titleFontWeight="font-bold"
      >
        <Trans message="AI text writer" />
      </DialogHeader>
      {activeScreen.name === 'generate' && (
        <GenerateScreen
          onGenerated={text => {
            setActiveScreen({name: 'refine', originalText: text});
          }}
        />
      )}
      {activeScreen.name === 'refine' && (
        <RefineAiTextScreen
          originalText={activeScreen.originalText}
          onNewPrompt={() => {
            setActiveScreen({name: 'generate'});
          }}
        />
      )}
    </Dialog>
  );
}

interface GenerateScreenProps {
  onGenerated: (text: string) => void;
}
function GenerateScreen({onGenerated}: GenerateScreenProps) {
  const {data: usage} = useAccountUsage();
  const noPermission = !!usage?.ai.text.failReason;
  const {formId, close} = useDialogContext();
  const form = useForm<GenerateTextWithAiPayload>();
  const {trans} = useTrans();
  const generateText = useGenerateTextWithAi(form);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Fragment>
      <DialogBody>
        <Form
          id={formId}
          form={form}
          onSubmit={data => {
            generateText.mutate(data, {
              onSuccess: response => onGenerated(response.content),
            });
          }}
        >
          <div className="relative">
            <FormTextField
              className={
                generateText.isPending ? 'opacity-0 transition-opacity' : ''
              }
              inputRef={inputRef}
              name="prompt"
              inputElementType="textarea"
              rows={2}
              placeholder={trans(
                message('Describe the text you want to create...'),
              )}
              autoFocus
              description={<AiTextWarningMessage />}
            />
            <AiTextLoadingIndicator isVisible={generateText.isPending} />
          </div>
          <OverTextTokenQuotaMessage />
          <div className="mb-8 mt-34 text-sm font-semibold">
            <Trans message="Example prompts" />
          </div>
          <div className="space-y-8 text-xs">
            {suggestedPrompts.map(prompt => (
              <ButtonBase
                onClick={() => {
                  prompt = prompt.replace(/\.\.\.$/, ' ');
                  form.setValue('prompt', prompt);
                  inputRef.current?.setSelectionRange(
                    prompt.length,
                    prompt.length,
                  );
                  inputRef.current?.focus();
                }}
                display="flex"
                className="w-max items-center gap-6 rounded-full border px-8 py-4 hover:bg-hover"
                key={prompt}
              >
                <PromptSuggestionIcon size="xs" className="text-muted" />
                <span>{prompt}</span>
              </ButtonBase>
            ))}
          </div>
        </Form>
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => close()}>
          <Trans message="Close" />
        </Button>
        <Button
          form={formId}
          type="submit"
          variant="flat"
          color="primary"
          disabled={generateText.isPending || noPermission}
          endIcon={<AiIcon />}
        >
          <Trans message="Generate" />
        </Button>
      </DialogFooter>
    </Fragment>
  );
}
