import {useTrans} from '@common/i18n/use-trans';
import {useEffect, useState} from 'react';
import {Elements, MappedElements} from '@app/editor/elements/elements';

export function useElements(): MappedElements | null {
  const {trans} = useTrans();
  const [elements, setElements] = useState<MappedElements | null>(null);

  useEffect(() => {
    if (!elements) {
      Elements.load(trans).then(mappedElements => {
        setElements(mappedElements);
      });
    }
  }, [elements, trans]);

  return elements;
}
