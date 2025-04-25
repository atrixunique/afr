import { menu } from '@blocksuite/affine-components/context-menu';
import { IS_MOBILE } from '@blocksuite/global/env';
import { html } from 'lit/static-html.js';

import { renderUniLit } from '../utils/uni-component/index.js';
import type { DatabaseBlockModel } from '@blocksuite/affine-model';
import type { Property } from '../view-manager/property.js';

import {databaseBlockAllPropertyMap} from '../../../../block-database/src/properties/index.ts';
import { propertyPresets } from '@blocksuite/data-view/property-presets';
import {
  insertPositionToIndex,
  type InsertToPosition,
} from '@blocksuite/affine-shared/utils';

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

    function getCurrentDatabaseColumn(property:Property):string {

      //console.log(property);
      return property.dataRef$?'-'+property.dataRef$:'';
    }

    function getAllDatabaseItems(property:Property) {
      const elements:Menu[]=[];
    
      const workspace=property.view?.dataSource.doc.workspace;
      const fullDocs=workspace.docs;

      // console.log(property);
      const thisTableName=property.tableView.dataSource._model.title.toString();
      
      // fullDocs.forEach(d => {
      //   const realDoc=d.getDoc();
      //   if(!realDoc.ready) {
      //     realDoc.load();
      //   }
      // });
    
      fullDocs.forEach(d => {
        //console.log(d.id);
        const realDoc=workspace.getDoc(d.id);
        //console.log(realDoc);
        if(!realDoc.meta.trash) {
          realDoc.getBlocksByFlavour("affine:database").forEach((dataDoc) => {

              //不要把自己再加入列表中
              if (dataDoc.model.title.toString() === thisTableName) return;
              
              elements.push(
                menu.action({
                prefix: renderUniLit(
                  property.view.propertyIconGet("date")
                ),
                name: '表"'+dataDoc.model.title.toString()+'" - '+realDoc.meta.title,
                select: () => {
                
                  ///设置另一表中的交叉引用
                  const workspace=property.view.dataSource.doc.workspace;
                  const targetTableName = dataDoc.model.title.toString();
                  const fullDocs = workspace.docs;
                  const docs: any[] = Array.isArray(fullDocs)
                                      ? fullDocs
                                      : Array.from(fullDocs ?? []);
                  docs.map( d => {
                    const realDoc= workspace.getDoc(d[0]);
                    if (!realDoc) {
                      console.error('Document not found:', d[0]);
                      return [];
                    }
                    const databases=realDoc.getBlocksByFlavour('affine:database');
                    databases.forEach(dataDoc => {
                      if (dataDoc.model.title.toString() == targetTableName) {
                        
                        //如果已有此列，则不再添加
                        if (dataDoc.model.columns.some(v => v.name === "[相关]"+thisTableName)) {
                          return;
                        }

                        const doc = dataDoc.doc;
                        doc.captureSync();
                        const column = databaseBlockAllPropertyMap[
                          propertyPresets.dataRefPropertyConfig.type
                        ].create("[相关]"+thisTableName);
                    
                        column.dataRef=thisTableName;
                        // console.log('column');
                        // console.log(column);
                        // console.log(dataDoc.model);

                        const id = doc.workspace.idGenerator();
                        if (dataDoc.model.columns.some(v => v.id === id)) {
                          return id;
                        }
                        doc.transact(() => {
                          const col: Column = {
                            ...column,
                            id,
                          };
                          dataDoc.model.columns.splice(
                            insertPositionToIndex('start', dataDoc.model.columns),
                            0,
                            col
                          );
                        });
                      }
                    });
                  });

                  //设置本表中的propert
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

  return menu.group({
    items: [
      menu.subMenu({
        name: '类型',
        hide: () => !property.typeCanSet,
        postfix: html` <div
          class="affine-database-column-type-icon"
          style="color: var(--affine-text-secondary-color);gap:4px;font-size: 14px;"
        >
          ${renderUniLit(property.icon)}
          ${property.view.propertyMetas$.value.find(
            v => v.type === property.type$.value
          )?.config.name}
          ${getCurrentDatabaseColumn(property)}
        </div>`,
        options: {
          title: {
            text: '选择类型',
          },
          items: [
            menu.group({
              items: property.view.propertyMetas$.value.map(config => {
                if(config.type!="data-ref")
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
                      property.view.propertyIconGet("data-ref")
                    ),
                    options: {
                      input: {
                        search: true,
                      },
                      placement: 'left-end',
                      items: getAllDatabaseItems(property)
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

