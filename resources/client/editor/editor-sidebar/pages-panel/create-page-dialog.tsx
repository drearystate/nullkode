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
import {getProductionHtml} from '@app/editor/utils/parse-html-into-document';
import {BLANK_PAGE_SKELETON} from '@app/projects/blank-page-skeleton';
import {nanoid} from 'nanoid';
import {BuilderPageWithId} from '@app/dashboard/project';
import {useTrans} from '@common/i18n/use-trans';
import {message} from '@common/i18n/message';
import {CrupdatePageFormFields} from '@app/editor/editor-sidebar/pages-panel/crupdate-page-form-fields';
import {useSaveEditorProject} from '@app/editor/use-save-editor-project';
import {SeoTags} from '@app/editor/utils/seo-tags';

export interface NewPagePayload extends SeoTags {
  name: string;
}

export function CreatePageDialog() {
  const {trans} = useTrans();
  const {close, formId} = useDialogContext();
  const form = useForm<NewPagePayload>();
  const saveProject = useSaveEditorProject();

  const onSubmit = (values: NewPagePayload) => {
    const existingPage = editorState().project?.pages.find(
      p => p.name.toLowerCase() === values.name.toLowerCase(),
    );
    if (existingPage) {
      form.setError('name', {
        type: 'manual',
        message: trans(message('A page with this name already exists.')),
      });
      return;
    }

    const page: BuilderPageWithId = {
      id: nanoid(10),
      ...values,
      html: getProductionHtml(BLANK_PAGE_SKELETON, null, values),
      hiddenInPagesPanel: true,
    };
    editorState().addNewPage(page);
    saveProject.mutate(
      {},
      {
        onSuccess: () => {
          editorState().setActivePage(page.id);
          close();
        },
      },
    );
  };

  return (
    <Dialog size="sm">
      <DialogHeader>
        <Trans message="New page" />
      </DialogHeader>
      <DialogBody>
        <Form id={formId} form={form} onSubmit={onSubmit}>
          <CrupdatePageFormFields />
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
          <Trans message="Create" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
