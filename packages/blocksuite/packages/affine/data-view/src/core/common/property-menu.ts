import { menu } from '@blocksuite/affine-components/context-menu';
import { IS_MOBILE } from '@blocksuite/global/env';
import { html } from 'lit/static-html.js';

import type { Property } from '../view-manager/property.js';

import { renderUniLit } from '../utils/uni-component/index.js';
import type { DatabaseBlockModel } from '@blocksuite/affine-model';

export const inputConfig = (property: Property) => {
  if (IS_MOBILE) {
    return menu.input({
      prefix: html`
        <div class="affine-database-column-type-menu-icon">
          ${renderUniLit(property.icon)}
        </div>
      `,
      initialValue: property.name$.value,
      onChange: text => {
        property.nameSet(text);
      },
    });
  }
  return menu.input({
    prefix: html`
      <div class="affine-database-column-type-menu-icon">
        ${renderUniLit(property.icon)}
      </div>
    `,
    initialValue: property.name$.value,
    onComplete: text => {
      property.nameSet(text);
    },
  });
};
export const typeConfig = (property: Property) => {
  return menu.group({
    items: [
      menu.subMenu({
        name: '类型',
        hide: () => !property.typeSet || property.type$.value === 'title',
        postfix: html` <div
          class="affine-database-column-type-icon"
          style="color: var(--affine-text-secondary-color);gap:4px;font-size: 14px;"
        >
          ${renderUniLit(property.icon)}
          ${property.view.propertyMetas.find(
            v => v.type === property.type$.value
          )?.config.name}
          ${getCurrentDatabaseColumn(property)}
        </div>`,
        options: {
          title: {
            text: 'Property type',
          },
          items: [
            menu.group({
              items: property.view.propertyMetas.map(config => {
                if (config.type != 'data-ref')
                  return menu.action({
                    isSelected: config.type === property.type$.value,
                    name: config.config.name,
                    prefix: renderUniLit(
                      property.view.propertyIconGet(config.type)
                    ),
                    select: () => {
                      if (property.type$.value === config.type) {
                        return;
                      }
                      property.typeSet?.(config.type);
                    },
                  });
                else
                  return menu.subMenu({
                    name: '数据库链接',
                    isSelected: config.type === property.type$.value,
                    prefix: renderUniLit(
                      property.view.propertyIconGet('data-ref')
                    ),
                    options: {
                      input: {
                        search: true,
                      },
                      placement: 'left-end',
                      items: getAllDatabaseItems(property),
                    },
                  });
              }),
            }),
          ],
        },
      }),
    ],
  });
};

function getCurrentDatabaseColumn(property: Property): string {
  return property.dataRef$ ? '-' + property.dataRef$ : '';
}

function getAllDatabaseItems(property: Property) {
  const elements: Menu[] = [];

  const docCollection = property.view?.dataSource.doc.collection;
  const fullDocs = docCollection.docs;

  fullDocs.forEach(d => {
    const realDoc = d.getDoc();
    if (!realDoc.ready) {
      realDoc.load();
    }
  });

  fullDocs.forEach(d => {
    const realDoc = d.getDoc();
    //console.log(realDoc);
    if (!realDoc.meta.trash) {
      realDoc.getBlocksByFlavour('affine:database').forEach(dataDoc => {
        elements.push(
          menu.action({
            prefix: renderUniLit(property.view.propertyIconGet('date')),
            name:
              '表"' +
              dataDoc.model.title.toString() +
              '" - ' +
              realDoc.meta.title,
            select: () => {
              property.dataRefSet(dataDoc.model.title.toString());
              property.typeSet?.('data-ref');
              //property.render();
              //console.log(property);
            },
          })
        );
      });
    }
  });

  return elements as Menu[];
}
