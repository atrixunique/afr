import { popupTargetFromElement } from '@blocksuite/affine-components/context-menu';
import { computed } from '@preact/signals-core';
import { html } from 'lit/static-html.js';

import type { SelectTag } from '../../core/index.js';
import type { SelectPropertyData } from '../select/define.js';

import { popRefSelect } from '../../core/component/tags/data-ref-select.js';
import { BaseCellRenderer } from '../../core/property/index.js';
import { createFromBaseCellRenderer } from '../../core/property/renderer.js';
import { createIcon } from '../../core/utils/uni-icon.js';
import { dataRefPropertyModelConfig } from './define.js';

export class DataRefCell extends BaseCellRenderer<
  string[],
  SelectPropertyData
> {
  private newOptions$ = computed(() => {
    const tableName = this.property.dataRef$.value;
    const workspace=this.property.view?.dataSource.doc.workspace;
    const fullDocs=workspace.docs;

    // const fullDocs = this.property.view?.dataSource.doc.collection.docs;
    const optionArray = [];

    fullDocs.forEach(d => {
      const realDoc=workspace.getDoc(d.id);
      if (!realDoc.meta.trash) {
        realDoc.getBlocksByFlavour('affine:database').forEach(dataDoc => {
          if (dataDoc.model.title.toString() == tableName) {
            const targetModel = dataDoc.model;
            targetModel.children.forEach(element => {
              optionArray.push({
                id: tableName + '-' + element.text.toString(),
                value: element.text.toString(),
                color: 'var(--affine-tag-blue)',
              });
            });
          }
        });
      }
    });
    //console.log(optionArray);
    return optionArray;
  });

  override render() {
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
    private newOptions$ = computed(() => {
      const tableName = this.property.dataRef$.value;
      const workspace=this.property.view?.dataSource.doc.workspace;
      const fullDocs=workspace.docs;

      // const fullDocs = this.property.view?.dataSource.doc.collection.docs;
      const optionArray = [];

      fullDocs.forEach(d => {
        const realDoc=workspace.getDoc(d.id);
        if (!realDoc.meta.trash) {
          realDoc.getBlocksByFlavour('affine:database').forEach(dataDoc => {
            if (dataDoc.model.title.toString() == tableName) {
              const targetModel = dataDoc.model;
              targetModel.children.forEach(element => {
                optionArray.push({
                  id: tableName + '-' + element.text.toString(),
                  value: element.text.toString(),
                  color: 'var(--affine-tag-blue)',
                });
              });
            }
          });
        }
      });
      //console.log(optionArray);
      return optionArray;
    });

  private popRefSelect = () => {
    this._disposables.add({
      dispose: popRefSelect(
        popupTargetFromElement(
          this.querySelector('affine-data-ref-view') ?? this
        ),
        {
          options: this.options$,
          onOptionsChange: this._onOptionsChange,
          value: this._value,
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
    this.popRefSelect();
  }

  override render() {
    return html`
      <affine-data-ref-view
        .value="${this._value}"
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
