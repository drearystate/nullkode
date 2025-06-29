import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {useState} from 'react';
import {layoutEditorState} from '@app/editor/editor-sidebar/layout-editor/layout-editor-store';

export function CustomRowPresetDialog() {
  const {close, formId} = useDialogContext<string>();
  const [value, setValue] = useState(() => {
    const columns = layoutEditorState().selectedRow?.columns || [];
    return columns.map(p => p.span).join('+');
  });
  const [isValid, setIsValid] = useState(() => customSpansAreValid(value));
  return (
    <Dialog size="xs">
      <DialogHeader>
        <Trans message="Customize row columns" />
      </DialogHeader>
      <DialogBody>
        <form
          id={formId}
          onSubmit={e => {
            e.preventDefault();
            close(value);
          }}
        >
          <TextField
            autoFocus
            size="sm"
            label={<Trans message="Columns" />}
            value={value}
            onChange={e => {
              setValue(e.target.value);
              setIsValid(customSpansAreValid(e.target.value));
            }}
            errorMessage={
              isValid ? undefined : (
                <Trans message="Sum of all spans should equal 12." />
              )
            }
            placeholder="4+4+4"
            required
            minLength={3}
            pattern="^(1[0-2]|[1-9])(\+(1[0-2]|[1-9]))*$"
            description="Enter spans (1-12) for each column separated by plus sign, total span should equal 12."
          />
        </form>
      </DialogBody>
      <DialogFooter>
        <Button type="button" onClick={() => close()} size="xs">
          <Trans message="Cancel" />
        </Button>
        <Button
          form={formId}
          type="submit"
          variant="flat"
          color="primary"
          size="xs"
          disabled={!isValid}
        >
          <Trans message="Save" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function customSpansAreValid(spans: string): boolean {
  const total = spans
    .split('+')
    .map(Number)
    .reduce((a, b) => a + b, 0);
  return total === 12;
}
