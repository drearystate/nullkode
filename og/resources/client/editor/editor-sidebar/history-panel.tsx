import React from 'react';
import {Trans} from '@common/i18n/trans';
import {List, ListItem} from '@common/ui/list/list';
import clsx from 'clsx';
import {EditorSidebarHeading} from '@app/editor/editor-sidebar/editor-sidebar-heading';
import {
  mutationState,
  useMutationStore,
} from '@app/editor/state/mutation-store';

export function HistoryPanel() {
  const stack = useMutationStore(s => s.mutationStack);
  const pointer = useMutationStore(s => s.pointer);

  return (
    <div>
      <EditorSidebarHeading>
        <Trans message="History" />
      </EditorSidebarHeading>
      <div className="px-14">
        <List className="space-y-10">
          <ListItem
            className={clsx(
              'border',
              pointer === -1 && 'border-primary font-semibold text-primary',
            )}
            onSelected={() => mutationState().goTo(-1)}
          >
            <Trans message="Initial" />
          </ListItem>
          {stack.map((item, index) => (
            <ListItem
              onSelected={() => mutationState().goTo(index)}
              key={item.uniqueId}
              className={clsx(
                'border',
                pointer === index &&
                  'border-primary font-semibold text-primary',
              )}
            >
              <Trans {...item.displayName} />
            </ListItem>
          ))}
        </List>
      </div>
    </div>
  );
}
