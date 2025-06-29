import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {EditorSidebarHeading} from '@app/editor/editor-sidebar/editor-sidebar-heading';
import {Trans} from '@common/i18n/trans';
import React, {Fragment, useRef, useState} from 'react';
import {BuilderPageWithId} from '@app/dashboard/project';
import clsx from 'clsx';
import {Button} from '@common/ui/buttons/button';
import {AddIcon} from '@common/icons/material/Add';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {CreatePageDialog} from '@app/editor/editor-sidebar/pages-panel/create-page-dialog';
import {List, ListItem} from '@common/ui/list/list';
import {IconButton} from '@common/ui/buttons/icon-button';
import {SettingsIcon} from '@common/icons/material/Settings';
import {UpdatePageDialog} from '@app/editor/editor-sidebar/pages-panel/update-page-dialog';
import {Menu, MenuTrigger} from '@common/ui/navigation/menu/menu-trigger';
import {Item} from '@common/ui/forms/listbox/item';
import {createDocFromHtml} from '@app/editor/utils/create-doc-from-html';
import {nanoid} from 'nanoid';
import {useSaveEditorProject} from '@app/editor/use-save-editor-project';
import {closeDialog, openDialog} from '@common/ui/overlays/store/dialog-store';
import {ConfirmationDialog} from '@common/ui/overlays/dialog/confirmation-dialog';
import {removeUnusedGoogleFontTags} from '@app/editor/mutations/style/text/set-font-family';

export function PagesPanel() {
  const pages = useEditorStore(s => s.project?.pages ?? []);
  return (
    <div>
      <EditorSidebarHeading
        actions={
          <DialogTrigger type="popover" placement="right" offset={14}>
            <Button variant="outline" size="xs" startIcon={<AddIcon />}>
              <Trans message="New page" />
            </Button>
            <CreatePageDialog />
          </DialogTrigger>
        }
      >
        <Trans message="Pages" />
      </EditorSidebarHeading>
      <div className="px-14">
        <List padding="p-0">
          {pages
            .filter(p => !p.hiddenInPagesPanel)
            .map(page => (
              <PageButton key={page.id} page={page} />
            ))}
        </List>
      </div>
    </div>
  );
}

interface PageButtonProps {
  page: BuilderPageWithId;
}
function PageButton({page}: PageButtonProps) {
  const activePagId = useEditorStore(s => s.activePageId);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const saveProject = useSaveEditorProject();
  const numberOfPages = useEditorStore(s => s.project?.pages.length ?? 0);

  const handleEdit = () => {
    // needed in order to hydrate seo tags form in update page dialog
    if (!page.doc) {
      page.doc = createDocFromHtml(page.html);
    }
    setDialogIsOpen(true);
  };

  const handleDuplicate = () => {
    const newPage = editorState().addNewPage({
      ...page,
      doc: undefined,
      id: nanoid(10),
      name: `${page.name}-copy`,
      // don't show in pages panel until project is saved
      hiddenInPagesPanel: true,
    });
    saveProject.mutate(
      {},
      {
        onSuccess: () => {
          editorState().setActivePage(newPage.id);
        },
      },
    );
  };

  const handleDelete = () => {
    openDialog(ConfirmationDialog, {
      isDanger: true,
      title: <Trans message="Delete page" />,
      body: <Trans message="Are you sure you want to delete this page?" />,
      confirm: <Trans message="Delete" />,
      onConfirm: () => {
        closeDialog();
        editorState().deletePage(page.id);
        if (activePagId === page.id) {
          const pages = editorState().project?.pages ?? [];
          const index = pages.findIndex(p => p.id === page.id);
          editorState().setActivePage(pages[index - 1]?.id ?? pages[0]?.id);
        }
        saveProject.mutate({});
      },
    });
  };

  return (
    <Fragment>
      <ListItem
        onSelected={() => {
          removeUnusedGoogleFontTags();
          editorState().setActivePage(page.id);
        }}
        padding="pl-10 py-4 pr-2"
        className={clsx(
          'mb-10 cursor-pointer rounded-panel border text-sm capitalize transition-colors hover:bg-hover',
          activePagId === page.id &&
            'border-primary font-semibold text-primary',
        )}
        endSection={
          <Fragment>
            <MenuTrigger ref={buttonRef}>
              <IconButton
                size="xs"
                disabled={saveProject.isPending}
                onClick={e => {
                  e.stopPropagation();
                  if (dialogIsOpen) {
                    setDialogIsOpen(false);
                  }
                }}
              >
                <SettingsIcon />
              </IconButton>
              <Menu>
                <Item
                  value="edit"
                  onClick={e => e.stopPropagation()}
                  onSelected={handleEdit}
                >
                  <Trans message="Settings" />
                </Item>
                <Item
                  value="duplicate"
                  onClick={e => e.stopPropagation()}
                  onSelected={handleDuplicate}
                >
                  <Trans message="Duplicate" />
                </Item>
                <Item
                  value="delete"
                  onClick={e => e.stopPropagation()}
                  isDisabled={
                    page.name.toLowerCase() === 'index' || numberOfPages < 2
                  }
                  onSelected={handleDelete}
                >
                  <Trans message="Delete" />
                </Item>
              </Menu>
            </MenuTrigger>
          </Fragment>
        }
      >
        {page.name}
      </ListItem>
      <DialogTrigger
        type="popover"
        placement="right"
        offset={14}
        triggerRef={buttonRef}
        isOpen={dialogIsOpen}
        onOpenChange={setDialogIsOpen}
      >
        <UpdatePageDialog page={page} />
      </DialogTrigger>
    </Fragment>
  );
}
