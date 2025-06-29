import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {useForm, useFormContext} from 'react-hook-form';
import {
  ModifyTextWithAiInstruction,
  ModifyTextWithAiPayload,
  ModifyTextWithAiTone,
  useModifyTextWithAi,
} from '@app/editor/ai/text/use-modify-text-with-ait';
import {Fragment, useRef} from 'react';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {Form} from '@common/ui/forms/form';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {Trans} from '@common/i18n/trans';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {useMutationState} from '@tanstack/react-query';
import {AiTextWarningMessage} from '@app/editor/ai/text/ai-text-warning-message';
import {Menu, MenuTrigger} from '@common/ui/navigation/menu/menu-trigger';
import {Item} from '@common/ui/forms/listbox/item';
import {KeyboardArrowDownIcon} from '@common/icons/material/KeyboardArrowDown';
import {useValueLists} from '@common/http/value-lists';
import {AiTextLoadingIndicator} from '@app/editor/ai/text/ai-text-loading-indicator';
import clsx from 'clsx';
import {useAccountUsage} from '@app/editor/use-account-usage';
import {OverTextTokenQuotaMessage} from '@app/editor/ai/text/over-text-token-quota-message';

interface Props {
  originalText: string;
  onNewPrompt: () => void;
}
export function RefineAiTextScreen({originalText, onNewPrompt}: Props) {
  const {data: usage} = useAccountUsage();
  const noPermission = !!usage?.ai.text.failReason;
  const {formId, close} = useDialogContext();
  const inputRef = useRef<HTMLInputElement>(null!);
  const form = useForm<ModifyTextWithAiPayload>({
    defaultValues: {
      text: originalText,
    },
  });
  const modifyText = useModifyTextWithAi(form);
  const isLoading = useMutationState({
    filters: {mutationKey: ['modifyTextWithAi']},
    select: mutation => mutation.state.status === 'pending',
  }).some(Boolean);

  return (
    <Fragment>
      <DialogBody>
        <Form id={formId} form={form} onSubmit={data => close(data.text)}>
          <div className="relative">
            <FormTextField
              inputRef={inputRef}
              className={clsx('transition-opacity', isLoading && 'opacity-0')}
              name="text"
              inputElementType="textarea"
              rows={2}
              description={<AiTextWarningMessage />}
              autoFocus
            />
            <AiTextLoadingIndicator isVisible={isLoading} />
          </div>
          <OverTextTokenQuotaMessage />
          <ModifyTextButtons
            disabled={isLoading || noPermission}
            onModify={() => {
              inputRef.current.focus();
              inputRef.current.setSelectionRange(
                inputRef.current.value.length,
                inputRef.current.value.length,
              );
            }}
          />
        </Form>
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => onNewPrompt()}>
          <Trans message="Discard" />
        </Button>
        <Button
          form={formId}
          type="submit"
          variant="flat"
          color="primary"
          disabled={modifyText.isPending}
        >
          <Trans message="Use text" />
        </Button>
      </DialogFooter>
    </Fragment>
  );
}

interface ModifyTextButtonsProps {
  disabled: boolean;
  onModify: () => void;
}
function ModifyTextButtons({disabled, onModify}: ModifyTextButtonsProps) {
  const form = useFormContext<ModifyTextWithAiPayload>();
  const modifyText = useModifyTextWithAi(form);

  const handleModify = (data: Partial<ModifyTextWithAiPayload>) => {
    modifyText.mutate(
      {
        instruction: data.instruction!,
        text: form.getValues('text'),
        tone: data.tone,
        language: data.language,
      },
      {
        onSuccess: response => {
          form.setValue('text', response.content);
          form.clearErrors();
          onModify();
        },
      },
    );
  };

  return (
    <div className="mt-34 flex items-center gap-10">
      <RefineDropdown
        disabled={disabled}
        onSelected={instruction => handleModify({instruction})}
      />
      <ChangeToneDropdown
        disabled={disabled}
        onSelected={tone => {
          handleModify({
            instruction: ModifyTextWithAiInstruction.ChangeTone,
            tone,
          });
        }}
      />
      <TranslateDropdown
        disabled={disabled}
        onSelected={language => {
          handleModify({
            instruction: ModifyTextWithAiInstruction.Translate,
            language,
          });
        }}
      />
    </div>
  );
}

interface ChangeToneDropdownProps {
  onSelected: (tone: ModifyTextWithAiTone) => void;
  disabled: boolean;
}
function ChangeToneDropdown({onSelected, disabled}: ChangeToneDropdownProps) {
  return (
    <MenuTrigger
      onItemSelected={value => onSelected(value as ModifyTextWithAiTone)}
    >
      <Button
        disabled={disabled}
        variant="outline"
        size="xs"
        endIcon={<KeyboardArrowDownIcon />}
        radius="rounded-full"
      >
        <Trans message="Change tone" />
      </Button>
      <Menu>
        {Object.values(ModifyTextWithAiTone).map(tone => (
          <Item value={tone} key={tone} capitalizeFirst>
            <Trans message={tone} />
          </Item>
        ))}
      </Menu>
    </MenuTrigger>
  );
}

interface RefineDropdownProps {
  disabled: boolean;
  onSelected: (instruction: ModifyTextWithAiInstruction) => void;
}
function RefineDropdown({onSelected, disabled}: RefineDropdownProps) {
  return (
    <MenuTrigger
      onItemSelected={value => onSelected(value as ModifyTextWithAiInstruction)}
    >
      <Button
        disabled={disabled}
        variant="outline"
        size="xs"
        endIcon={<KeyboardArrowDownIcon />}
        radius="rounded-full"
      >
        <Trans message="Refine" />
      </Button>
      <Menu>
        <Item value={ModifyTextWithAiInstruction.Simplify}>
          <Trans message="Simplify language" />
        </Item>
        <Item value={ModifyTextWithAiInstruction.Shorten}>
          <Trans message="Shorten" />
        </Item>
        <Item value={ModifyTextWithAiInstruction.Lengthen}>
          <Trans message="Lenghten" />
        </Item>
        <Item value={ModifyTextWithAiInstruction.FixSpelling}>
          <Trans message="Fix spelling & grammar" />
        </Item>
      </Menu>
    </MenuTrigger>
  );
}

interface TranslateDropdownProps {
  onSelected: (language: string) => void;
  disabled: boolean;
}
function TranslateDropdown({onSelected, disabled}: TranslateDropdownProps) {
  const {data} = useValueLists(['languages']);
  return (
    <MenuTrigger
      onItemSelected={value => onSelected(value as string)}
      showSearchField
    >
      <Button
        disabled={disabled}
        variant="outline"
        size="xs"
        endIcon={<KeyboardArrowDownIcon />}
        radius="rounded-full"
      >
        <Trans message="Translate" />
      </Button>
      <Menu>
        {data?.languages?.map(language => (
          <Item value={language.code} key={language.code}>
            {language.name}
          </Item>
        ))}
      </Menu>
    </MenuTrigger>
  );
}
