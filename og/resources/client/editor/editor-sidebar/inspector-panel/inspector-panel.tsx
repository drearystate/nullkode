import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {Fragment} from 'react';
import {ChevronRightIcon} from '@common/icons/material/ChevronRight';
import {setHoveredContext} from '@app/editor/state/set-hovered-context';
import {HoveredElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import clsx from 'clsx';
import {Button} from '@common/ui/buttons/button';
import {Trans} from '@common/i18n/trans';
import {IllustratedMessage} from '@common/ui/images/illustrated-message';
import {SvgImage} from '@common/ui/images/svg-image/svg-image';
import websiteBuilderImage from '@app/editor/editor-sidebar/inspector-panel/website-builder.svg';
import {ElementEditableProp} from '@app/editor/elements/architect-element';
import {Accordion, AccordionItem} from '@common/ui/accordion/accordion';
import {PaddingEditor} from '@app/editor/editor-sidebar/inspector-panel/padding-editor';
import {MarginEditor} from '@app/editor/editor-sidebar/inspector-panel/margin-editor';
import {MessageDescriptor} from '@common/i18n/message-descriptor';
import {BorderEditor} from '@app/editor/editor-sidebar/inspector-panel/border-editor/border-editor';
import {BorderRadiusEditor} from '@app/editor/editor-sidebar/inspector-panel/border-editor/border-radius-editor';
import {TypographyEditor} from '@app/editor/editor-sidebar/inspector-panel/typography-editor/typography-editor';
import {EditorSidebarHeading} from '@app/editor/editor-sidebar/editor-sidebar-heading';
import {BackgroundEditor} from '@app/editor/editor-sidebar/inspector-panel/background-editor/background-editor';
import {ShadowEditor} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/shadow-editor';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {SettingsEditor} from '@app/editor/editor-sidebar/inspector-panel/settings-editor/settings-editor';
import {VisibilityEditor} from '@app/editor/editor-sidebar/inspector-panel/visibility-editor/visibility-editor';
import {
  CreateImageWithAiButton,
  CreateTextWithAiButton,
  EditTextWithAiButton,
} from '@app/editor/editor-sidebar/inspector-panel/ai-action-buttons';

const StyleEditors: Record<
  ElementEditableProp,
  {
    label: MessageDescriptor;
    component: React.ComponentType;
  }[]
> = {
  [ElementEditableProp.Settings]: [
    {
      label: {message: 'Settings'},
      component: SettingsEditor,
    },
  ],
  [ElementEditableProp.Visibility]: [
    {
      label: {message: 'Visibility'},
      component: VisibilityEditor,
    },
  ],
  [ElementEditableProp.Padding]: [
    {
      label: {message: 'Padding'},
      component: PaddingEditor,
    },
  ],
  [ElementEditableProp.Margin]: [
    {
      label: {message: 'Margin'},
      component: MarginEditor,
    },
  ],
  [ElementEditableProp.Border]: [
    {
      label: {message: 'Border'},
      component: BorderEditor,
    },
    {
      label: {message: 'Border radius'},
      component: BorderRadiusEditor,
    },
  ],
  [ElementEditableProp.Text]: [
    {
      label: {message: 'Typography'},
      component: TypographyEditor,
    },
  ],
  [ElementEditableProp.Background]: [
    {
      label: {message: 'Background'},
      component: BackgroundEditor,
    },
  ],
  [ElementEditableProp.Shadow]: [
    {
      label: {message: 'Shadow'},
      component: ShadowEditor,
    },
  ],
};

export function InspectorPanel() {
  const selectedCtx = useEditorStore(s => s.selectedContext);
  return (
    <div>
      <EditorSidebarHeading>
        <Trans message="Inspector" />
      </EditorSidebarHeading>
      {selectedCtx ? (
        <Fragment>
          <div className="px-12">
            <SelectedElementBreadcrumb />
            <SelectedElementActions />
          </div>
          <Accordion mode="multiple" defaultExpandedValues={[0]}>
            {selectedCtx.el.canEdit.map(name =>
              (StyleEditors[name] ?? []).map(
                ({label, component: Component}, i) => (
                  <AccordionItem
                    key={`${name}:${i}`}
                    label={<Trans {...label} />}
                  >
                    <Component />
                  </AccordionItem>
                ),
              ),
            )}
          </Accordion>
        </Fragment>
      ) : (
        <NothingSelectedMessage />
      )}
    </div>
  );
}

function NothingSelectedMessage() {
  return (
    <div className="mt-140 px-12">
      <IllustratedMessage
        size="sm"
        image={<SvgImage src={websiteBuilderImage} />}
        title={<Trans message="Nothing selected" />}
        description={
          <Trans message="Click any element on the left to select it" />
        }
      />
    </div>
  );
}

function SelectedElementBreadcrumb() {
  const path = useEditorStore(s => s.selectedContext?.path ?? []);
  return (
    <div className="mb-24 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      {path.map((p, i) => {
        const isLast = i === path.length - 1;
        return (
          <Fragment key={i}>
            <button
              className={clsx(
                'capitalize transition-colors hover:text-primary',
                isLast && 'font-bold',
              )}
              onMouseEnter={() => {
                if (p.nodeId) {
                  setHoveredContext(p.nodeId);
                }
              }}
              onMouseLeave={() => {
                HoveredElementOverlay.hide();
              }}
              onClick={() => {
                if (p.nodeId) {
                  setSelectedContext(p.nodeId);
                }
              }}
            >
              {p.name}
            </button>
            {p.name && p.nodeId && !isLast && <ChevronRightIcon size="xs" />}
          </Fragment>
        );
      })}
    </div>
  );
}

function SelectedElementActions() {
  const actions = useEditorStore(s => s.selectedContext?.el.editActions);
  if (!actions) return null;

  return (
    <div className="mb-24 flex flex-wrap items-center gap-8">
      {actions.map(item => {
        const action = item.action;
        if (action === 'aiCreateText') {
          return <CreateTextWithAiButton key={action} name={item.name} />;
        }
        if (action === 'aiEditText') {
          return <EditTextWithAiButton key={action} name={item.name} />;
        }
        if (action === 'aiCreateImage') {
          return <CreateImageWithAiButton key={action} name={item.name} />;
        }
        return (
          <Button
            variant="outline"
            color="primary"
            key={item.name}
            size="xs"
            onClick={() => {
              const node = editorState().selectedContext?.node;
              if (node) {
                action(node);
              }
            }}
          >
            <Trans message={item.name} />
          </Button>
        );
      })}
    </div>
  );
}
