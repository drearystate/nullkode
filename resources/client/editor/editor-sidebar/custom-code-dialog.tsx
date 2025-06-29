import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import React, {createRef, Suspense, useState} from 'react';
import {ProgressCircle} from '@common/ui/progress/progress-circle';
import type ReactAce from 'react-ace';
import {ButtonGroup} from '@common/ui/buttons/button-group';
import {Button} from '@common/ui/buttons/button';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {editorState} from '@app/editor/state/editor-store';
import {useSaveEditorProject} from '@app/editor/use-save-editor-project';
import {nanoid} from 'nanoid';
import {toast} from '@common/ui/toast/toast';
import {message} from '@common/i18n/message';
import {SectionHelper} from '@common/ui/section-helper';
import {Link} from 'react-router-dom';
import {LinkStyle} from '@common/ui/buttons/external-link';
import {LockIcon} from '@common/icons/material/Lock';
import {useAccountUsage} from '@app/editor/use-account-usage';

const AceEditor = React.lazy(() => import('@common/ace-editor/ace-editor'));

export function CustomCodeDialog() {
  const {close} = useDialogContext();
  const saveProject = useSaveEditorProject();
  const [selectedMode, _setSelectedMode] = useState<'js' | 'css'>('css');
  const [isValid, setIsValid] = useState<boolean>(true);
  const editorRef = createRef<ReactAce | null>();
  const {data: usage} = useAccountUsage();

  const [value, setValue] = useState(() => {
    return {
      css: editorState().project?.css ?? '',
      js: editorState().project?.js ?? '',
    };
  });

  const saveCustomCode = () => {
    const payload = {
      ...value,
      [selectedMode]: editorRef.current?.editor.getValue(),
    };
    saveProject.mutate(payload, {
      onSuccess: () => {
        reloadAssetsInEditor();
        close();
        toast(message('Custom code saved'));
      },
    });
  };

  const changeEditorMode = (mode: 'js' | 'css') => {
    const currentEditorValue = editorRef.current?.editor.getValue();
    const newEditorValue = value[mode];
    setValue({
      ...value,
      [selectedMode]: currentEditorValue,
    });
    if (currentEditorValue !== newEditorValue) {
      editorRef.current?.editor.setValue(newEditorValue, -1);
    }
    _setSelectedMode(mode);
  };

  return (
    <Dialog size="fullscreen" className="h-full w-full">
      <DialogHeader
        actions={
          <ButtonGroup
            variant="outline"
            radius="rounded-md"
            size="xs"
            value={selectedMode}
            onChange={changeEditorMode}
            className="mr-auto"
          >
            <Button value="css">
              <Trans message="CSS" />
            </Button>
            <Button value="js">
              <Trans message="JavaScript" />
            </Button>
          </ButtonGroup>
        }
      >
        <Trans message="Custom code" />
      </DialogHeader>
      <DialogBody className="relative flex-auto" padding="p-0">
        {usage?.projects.customCode === false && (
          <SectionHelper
            className="absolute inset-0 z-10 m-auto h-max w-max shadow"
            description={
              <div className="flex items-center gap-6">
                <LockIcon className="text-primary" size="sm" />
                <Trans
                  message="To unlock custom code for this site <a>upgrade your plan.</a>"
                  values={{
                    a: text => (
                      <Link className={LinkStyle} to="/pricing">
                        {text}
                      </Link>
                    ),
                  }}
                />
              </div>
            }
          />
        )}
        <Suspense
          fallback={
            <div className="flex h-400 w-full items-center justify-center">
              <ProgressCircle
                aria-label="Loading editor..."
                isIndeterminate
                size="md"
              />
            </div>
          }
        >
          <AceEditor
            beautify={false}
            mode={selectedMode === 'js' ? 'javascript' : selectedMode}
            onChange={() => {}}
            defaultValue={value[selectedMode] || ''}
            onIsValidChange={setIsValid}
            editorRef={editorRef}
          />
        </Suspense>
      </DialogBody>
      <DialogFooter dividerTop>
        <Button onClick={() => close()}>
          <Trans message="Cancel" />
        </Button>
        <Button
          disabled={
            !usage?.projects.customCode || !isValid || saveProject.isPending
          }
          variant="flat"
          color="primary"
          onClick={() => saveCustomCode()}
        >
          <Trans message="Save" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function reloadAssetsInEditor() {
  const cssEl = editorState()
    .getEditorDoc()
    .querySelector('#custom-css') as HTMLLinkElement;
  const cssUrl = new URL(cssEl.href);
  cssEl.href = `${cssUrl.origin}${cssUrl.pathname}?${nanoid(8)}`;

  const jsEl = editorState()
    .getEditorDoc()
    .querySelector('#custom-js') as HTMLScriptElement;
  const jsUrl = new URL(jsEl.src);
  jsEl.src = `${jsUrl.origin}${jsUrl.pathname}?${nanoid(8)}`;
}
