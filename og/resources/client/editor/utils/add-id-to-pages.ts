import {BuilderPage, BuilderPageWithId} from '@app/dashboard/project';
import {nanoid} from 'nanoid';

export function addIdToPages(
  pages: (BuilderPage | BuilderPageWithId)[],
): BuilderPageWithId[] {
  return pages.map(page => {
    const pageWidthId = page as BuilderPageWithId;
    pageWidthId.id = pageWidthId.id ?? nanoid(10);
    return pageWidthId;
  });
}
