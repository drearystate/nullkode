import React, {Fragment} from 'react';
import {IconButton} from '@common/ui/buttons/icon-button';
import {editorState} from '@app/editor/state/editor-store';
import {SidebarPanel} from '@app/editor/editor-sidebar/sidebar-panel';
import {EditIcon} from '@common/icons/material/Edit';
import {findNodeById} from '@app/editor/utils/find-nodes-by-id';
import {CloneNode} from '@app/editor/mutations/dom/clone-node';
import {ContentCopyIcon} from '@common/icons/material/ContentCopy';
import {DeleteNode} from '@app/editor/mutations/dom/delete-node';
import {CloseIcon} from '@common/icons/material/Close';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {mutationState} from '@app/editor/state/mutation-store';

interface Props {
  nodeId: string;
  onAfterDelete?: () => void;
}
export function LayoutItemActions({nodeId, onAfterDelete}: Props) {
  return (
    <Fragment>
      <IconButton
        size="sm"
        variant="outline"
        radius="rounded-none"
        border="border-l"
        className="text-muted"
        onClick={() => {
          setSelectedContext(nodeId);
          editorState().setActivePanel(SidebarPanel.STYLE);
        }}
      >
        <EditIcon />
      </IconButton>
      <IconButton
        size="sm"
        iconSize="xs"
        variant="outline"
        radius="rounded-none"
        border="border-l"
        className="text-muted"
        onClick={() => {
          const node = findNodeById(nodeId, editorState().getEditorDoc());
          if (node) {
            mutationState().executeMutation(new CloneNode(node), {
              lastInSession: true,
            });
          }
        }}
      >
        <ContentCopyIcon />
      </IconButton>
      <IconButton
        size="sm"
        variant="outline"
        radius="rounded-none"
        border="border-l"
        className="text-muted"
        onClick={() => {
          const node = findNodeById(nodeId, editorState().getEditorDoc());
          if (node) {
            const executed = mutationState().executeMutation(
              new DeleteNode(node),
              {
                lastInSession: true,
              },
            );
            if (executed) {
              onAfterDelete?.();
            }
          }
        }}
      >
        <CloseIcon />
      </IconButton>
    </Fragment>
  );
}
