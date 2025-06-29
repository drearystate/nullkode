import {useElements} from '@app/editor/elements/use-elements';
import {Accordion, AccordionItem} from '@common/ui/accordion/accordion';
import {Trans} from '@common/i18n/trans';
import {ButtonBase} from '@common/ui/buttons/button-base';
import {ArchitectElement} from '@app/editor/elements/architect-element';
import React, {cloneElement, Fragment, isValidElement, useRef} from 'react';
import {createSvgIconFromTree} from '@common/icons/create-svg-icon';
import {
  DragPreviewRenderer,
  useDraggable,
} from '@common/ui/interactions/dnd/use-draggable';
import {editorState} from '@app/editor/state/editor-store';
import {ElementDragPreview} from '@app/editor/elements/element-drag-preview';
import {ElementContextData} from '@app/editor/elements/element-context-data';
import {EditorSidebarHeading} from '@app/editor/editor-sidebar/editor-sidebar-heading';

export function ElementsPanel() {
  const data = useElements();

  if (!data) return null;

  const elementsForCategory = (category: string) =>
    data.elements.filter(element => element.category === category);

  return (
    <div>
      <EditorSidebarHeading>
        <Trans message="Elements" />
      </EditorSidebarHeading>
      <Accordion defaultExpandedValues={[0]}>
        {data.categories.map(category => (
          <AccordionItem
            key={category}
            label={
              <div className="capitalize">
                <Trans message={category} />
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-8">
              {elementsForCategory(category).map(element => (
                <ElementButton key={element.name} element={element} />
              ))}
            </div>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

interface ElementButtonProps {
  element: ArchitectElement;
}
function ElementButton({element}: ElementButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<DragPreviewRenderer>(null);
  const {draggableProps} = useDraggable({
    id: element.name,
    type: 'element-panel',
    ref,
    preview: previewRef,
    getData: () => ({el: element}) as ElementContextData,
    onDragStart: () => editorState().setDragState('dragging'),
    onDragEnd: () => editorState().setDragState(false),
  });
  return (
    <Fragment>
      <ButtonBase
        key={element.name}
        display="flex"
        className="cursor-move flex-col items-center rounded-panel border py-18 transition-colors hover:bg-hover"
        ref={ref}
        {...draggableProps}
      >
        <ElementIcon config={element} />
        <span className="mt-6 block text-xs font-medium capitalize">
          <Trans message={element.name} />
        </span>
      </ButtonBase>
      <ElementDragPreview ref={previewRef} element={element} />
    </Fragment>
  );
}

interface ElementIconProps {
  config: ArchitectElement;
}
function ElementIcon({config}: ElementIconProps) {
  if (!config.icon) return null;

  let icon;
  if (isValidElement(config.icon)) {
    icon = cloneElement(config.icon, {size: 'md'});
  } else {
    const IconEl = createSvgIconFromTree(config.icon);
    icon = <IconEl size="md" />;
  }

  return <span className="text-muted">{icon}</span>;
}
