import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {Form} from '@common/ui/forms/form';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {useForm} from 'react-hook-form';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {editorState} from '@app/editor/state/editor-store';
import {BuilderPageWithId} from '@app/dashboard/project';
import {useTrans} from '@common/i18n/use-trans';
import {message} from '@common/i18n/message';
import {CrupdatePageFormFields} from '@app/editor/editor-sidebar/pages-panel/crupdate-page-form-fields';
import {useSaveEditorProject} from '@app/editor/use-save-editor-project';
import {NewPagePayload} from '@app/editor/editor-sidebar/pages-panel/create-page-dialog';
import {getSeoTags, setSeoTags} from '@app/editor/utils/seo-tags';

interface Props {
  page: BuilderPageWithId;
}
export function UpdatePageDialog({page}: Props) {
  const {trans} = useTrans();
  const {close, formId} = useDialogContext();

  const form = useForm<NewPagePayload>({
    defaultValues: {
      name: page.name,
      ...(page.doc ? getSeoTags(page.doc) : {}),
    },
  });
  const saveProject = useSaveEditorProject();

  const onSubmit = (values: NewPagePayload) => {
    const existingPage = editorState().project?.pages.find(
      p =>
        p.name.toLowerCase() === values.name.toLowerCase() && p.id !== page.id,
    );
    if (existingPage) {
      form.setError('name', {
        type: 'manual',
        message: trans(message('A page with this name already exists.')),
      });
      return;
    }

    editorState().updatePage(page.id, values);
    updateSeoTags(values, page);

    saveProject.mutate(
      {},
      {
        onSuccess: () => close(),
      },
    );
  };

  return (
    <Dialog size="sm">
      <DialogHeader>
        <Trans message="Update page" />
      </DialogHeader>
      <DialogBody>
        <Form id={formId} form={form} onSubmit={onSubmit}>
          <CrupdatePageFormFields
            isIndexPage={page.name.toLowerCase() === 'index'}
          />
        </Form>
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => close()} size="xs">
          <Trans message="Cancel" />
        </Button>
        <Button
          variant="flat"
          color="primary"
          type="submit"
          size="xs"
          form={formId}
          disabled={saveProject.isPending}
        >
          <Trans message="Save" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function updateSeoTags(value: NewPagePayload, page: BuilderPageWithId) {
  const docs: Document[] = [];
  if (page.doc) {
    docs.push(page.doc);
  }
  if (editorState().activePageId === page.id) {
    docs.push(editorState().getEditorDoc());
  }
  docs.forEach(doc => setSeoTags(value, doc));
}
