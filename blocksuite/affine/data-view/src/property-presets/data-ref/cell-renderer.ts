import { popupTargetFromElement } from '@blocksuite/affine-components/context-menu';
import { computed } from '@preact/signals-core';
import { effect, type ReadonlySignal } from '@preact/signals-core';

import { html } from 'lit/static-html.js';

import type { SelectTag } from '../../core/index.js';
import type { SelectPropertyData } from '../select/define.js';

import { popRefSelect } from '../../core/component/tags/data-ref-select.js';
import { BaseCellRenderer } from '../../core/property/index.js';
import { createFromBaseCellRenderer } from '../../core/property/renderer.js';
import { createIcon } from '../../core/utils/uni-icon.js';
import { dataRefPropertyModelConfig } from './define.js';

import { isLinkedDoc } from '../../../../block-database/src/utils/title-doc.js';
import type { WorkspaceImpl } from '@affine/core/modules/workspace/impls/workspace.js';

const analyzeDoc = async (workspace:WorkspaceImpl, docId:string, tableName:string, renderer) => {

  //console.log('analyzeDoc', docId, tableName);

  const dataRefList:string[]=[];
  const realDoc= workspace.getDoc(docId);
  
  if (!realDoc) {
    console.error('Document not found:', docId);
    return [];
  }
  if (!realDoc.loaded) {
    try {
      realDoc.load();
    } catch (e) {
      console.error(e);
    }
  }
  if(realDoc.meta.trash)  return;
  if (!realDoc.root) {
    await new Promise<void>(resolve => {
      realDoc.slots.rootAdded.once(() => {
        resolve();
      });
    });
  }

  const databases=realDoc.getBlocksByFlavour('affine:database');
  databases.forEach(dataDoc => {
    if (dataDoc.model.title.toString() == tableName) {
      
      //console.log('found table '+ tableName);

      const targetModel = dataDoc.model;
      //console.log(targetModel);

      targetModel.children.forEach(element => {
          const deltas = element.text.deltas$.value;
          deltas.map(delta => {
              let rowText="";
              let linkText="";
              if (isLinkedDoc(delta)) {
                const linkedDocId = delta.attributes?.reference?.pageId as string;
                rowText=workspace.getDoc(linkedDocId)?.meta?.title;
                linkText=linkedDocId;   
              }
              else rowText=delta.insert;
              //console.log("rowText",rowText);

              dataRefList.push({
                id: tableName + '-' + rowText,
                value: rowText,
                link: linkText,
                color: 'var(--affine-tag-blue)',
                dataDoc: dataDoc,
                tableName: tableName,
                // dbc: renderer.closest<DatabaseBlockComponent>('affine-database'),

                  });
              })
          });
    }
  });
  //console.log(dataRefList);
  
  return dataRefList;
}

// function createNewOptions<T, P>(renderer: BaseCellRenderer<T, P>) {

  
//   return computed( () => {
//     const workspace=renderer.view.dataSource.doc.workspace;
//     const fullDocs=workspace.docs;
//     const tableName = renderer.property.dataRef$.value;

//     fullDocs.forEach(d => {
      
//       let singleRefList = analyzeDoc(workspace, d.id, tableName);
            
//       if(singleRefList.length>0)  {
        
//         return singleRefList;
//       }
//     });
//   return [];
//   });
// }

export class DataRefCell extends BaseCellRenderer<
  string[],
  SelectPropertyData
> {

  private newOptions$: ReadonlySignal<SelectTag[]>=[];

  override connectedCallback() {
    super.connectedCallback();
   
      const workspace = this.view.dataSource.doc.workspace;
      const tableName = this.property.dataRef$.value;
    
      // 调用异步函数，但不要在 effect 里直接用 then
      this.updateOptionsAsync(workspace, tableName);
  }

  private async updateOptionsAsync(workspace: Workspace, tableName: string) {
    
    const fullDocs = workspace.docs;

    const docs: any[] = Array.isArray(fullDocs)
      ? fullDocs
      : Array.from(fullDocs ?? []);
  
    if (docs.length === 0) return;
    // debugger;
    const results = await Promise.all(
      docs.map(async d => {
        // console.log('analyzeDoc', d[0], tableName);
        return await analyzeDoc(workspace, d[0], tableName, this);
      })
    );
    
    
    const filtered = results.find(list => list && list.length > 0) || [];
    
    this.newOptions$.value = filtered;
    this.forceUpdate();
  }


  override render() {
    
    //console.log(this.newOptions$.value);
    //console.log("cell render");
    if(!this.newOptions$.value) return html``;

    return html`
      <affine-data-ref-view
        .value="${Array.isArray(this.value) ? this.value : []}"
        .options="${this.newOptions$.value}"
      ></affine-data-ref-view>
    `;
  }
}

export class DataRefCellEditing extends BaseCellRenderer<
  string[],
  SelectPropertyData
> {
  // private newOptions$ = createNewOptions(this);

  private newOptions$: ReadonlySignal<SelectTag[]>=[];

  private async updateOptionsAsync(workspace: Workspace, tableName: string) {
    
    const fullDocs = workspace.docs;
    const docs: any[] = Array.isArray(fullDocs)
      ? fullDocs
      : Array.from(fullDocs ?? []);
  
    if (docs.length === 0) return;
    // debugger;
    const results = await Promise.all(
      docs.map(async d => {
        // console.log('analyzeDoc', d[0], tableName);
        return await analyzeDoc(workspace, d[0], tableName, this);
      })
    );
    
    const filtered = results.find(list => list && list.length > 0) || []; 
    this.newOptions$.value = filtered;
  }

  private popRefSelect = async() => {

    const workspace = this.view.dataSource.doc.workspace;
    const tableName = this.property.dataRef$.value;
  
    // 调用异步函数，但不要在 effect 里直接用 then
    await this.updateOptionsAsync(workspace, tableName);


    this._disposables.add({
      dispose: popRefSelect(
        popupTargetFromElement(
          this.querySelector('affine-data-ref-view') ?? this
        ),
        {
          options: this.options$,
          onOptionsChange: this._onOptionsChange,
          value: Array.isArray(this.value) ? this.value : [],
          onChange: this._onChange,
          onComplete: this._editComplete,
          minWidth: 400,
        }
      ),
    });
  };

  _editComplete = () => {
    this.selectCurrentCell(false);
  };

  _onChange = (ids: string[]) => {
    this.onChange(ids);
  };

  _onOptionsChange = (options: SelectTag[]) => {
    this.property.dataUpdate(data => {
      return {
        ...data,
        options,
      };
    });
  };

  options$ = computed(() => {
    //return this.property.data$.value.options;
    return this.newOptions$.value;
  });

  get _value() {
    return this.value ?? [];
  }

  override firstUpdated() {
    //console.log('firstUpdated');
    this.popRefSelect();
  }

  override render() {
    return html`
      <affine-data-ref-view
        .value="${Array.isArray(this.value) ? this.value : []}"
        .options="${this.newOptions$.value}"
      ></affine-data-ref-view>
    `;
  }
}

export const dataRefPropertyConfig =
  dataRefPropertyModelConfig.createPropertyMeta({
    icon: createIcon('DuplicateIcon'),
    cellRenderer: {
      view: createFromBaseCellRenderer(DataRefCell),
      edit: createFromBaseCellRenderer(DataRefCellEditing),
    },
  });
