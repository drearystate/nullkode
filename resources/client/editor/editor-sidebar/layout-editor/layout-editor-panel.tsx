import {EditorSidebarHeading} from '@app/editor/editor-sidebar/editor-sidebar-heading';
import {Trans} from '@common/i18n/trans';
import React, {Fragment} from 'react';
import {
  ContainerConfig,
  layoutEditorState,
  useLayoutEditorStore,
} from '@app/editor/editor-sidebar/layout-editor/layout-editor-store';
import {AccordionItem} from '@common/ui/accordion/accordion';
import {AnimatePresence} from 'framer-motion';
import {setHoveredContext} from '@app/editor/state/set-hovered-context';
import {HoveredElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {editorState} from '@app/editor/state/editor-store';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {findNodeById} from '@app/editor/utils/find-nodes-by-id';
import {NewLayoutEditorItemButton} from '@app/editor/editor-sidebar/layout-editor/new-layout-editor-item-button';
import {LayoutEditorRowList} from '@app/editor/editor-sidebar/layout-editor/layout-editor-row-list';
import {LayoutItemActions} from '@app/editor/editor-sidebar/layout-editor/layout-item-actions';

export function LayoutEditorPanel() {
  return (
    <div>
      <EditorSidebarHeading>
        <Trans message="Layout" />
      </EditorSidebarHeading>
      <div className="px-14">
        <ContainerList />
      </div>
    </div>
  );
}

function ContainerList() {
  const containers = useLayoutEditorStore(s => s.allContainers);
  return (
    <div>
      <AnimatePresence>
        <NewLayoutEditorItemButton
          textClassName="text-muted group-hover:text-primary"
          onClick={() => {
            layoutEditorState().insertNewContainer(containers[0]?.id, 'before');
          }}
        >
          <Trans message="+ Add container" />
        </NewLayoutEditorItemButton>
        {containers.map((container, index) => (
          <Fragment key={index}>
            <ContainerItem container={container} index={index} />
            <NewLayoutEditorItemButton
              textClassName="text-primary invisible group-hover:visible"
              onClick={() => {
                layoutEditorState().insertNewContainer(container.id, 'after');
              }}
            >
              <Trans message="+ Add container" />
            </NewLayoutEditorItemButton>
          </Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ContainerItemProps {
  container: ContainerConfig;
  index: number;
}
function ContainerItem({container, index}: ContainerItemProps) {
  const selectedContainerId = useLayoutEditorStore(s => s.selectedContainer);
  const containers = useLayoutEditorStore(s => s.allContainers);
  return (
    <AccordionItem
      onHeaderMouseEnter={() => setHoveredContext(container.id)}
      onHeaderMouseLeave={() => HoveredElementOverlay.remove()}
      expandedValues={selectedContainerId ? [selectedContainerId] : []}
      value={container.id}
      mode="single"
      footerContent={
        <div className="flex justify-end border-t">
          <LayoutItemActions
            nodeId={container.id}
            onAfterDelete={() => {
              if (containers[index - 1]) {
                setSelectedContext(containers[index - 1].id);
              }
            }}
          />
        </div>
      }
      setExpandedValues={values => {
        setSelectedContext(values[0] as string);
        findNodeById(
          values[0] as string,
          editorState().getEditorDoc(),
        )?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }}
      variant="outline"
      label={<Trans message="Container :number" values={{number: index + 1}} />}
    >
      <LayoutEditorRowList container={container} />
    </AccordionItem>
  );
}
