import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { ShadowlessElement } from '@blocksuite/block-std';
import { WithDisposable } from '@blocksuite/global/utils';
import { css } from 'lit';
import { property, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { html } from 'lit/static-html.js';

import type { SelectTag } from '../../logical/index.js';

import { getColorByColor } from './colors.js';

export class DataRefView extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    affine-multi-tag-view {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      min-height: 22px;
    }

    .affine-select-cell-container * {
      box-sizing: border-box;
    }

    .affine-select-cell-container {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      width: 100%;
      font-size: var(--affine-font-sm);
    }

    .affine-select-cell-container .select-selected {
      height: 22px;
      font-size: 14px;
      line-height: 20px;
      padding: 0 8px;
      border-radius: 4px;
      white-space: nowrap;
      background-color: var(--affine-tag-white);
      overflow: hidden;
      text-overflow: ellipsis;
      border: 1px solid ${unsafeCSSVarV2('database/border')};
    }

    .affine-select-cell-container .select-link {
      background-color: var(--affine-tag-red);
    }
  `;

  override render() {

    const values = this.value;
    //const values = ["组织-HKDC"];
        
  
    const map = new Map<string, SelectTag>(this.options?.map(v => [v.id, v]));
  

     return html`
      <div contenteditable="false" class="affine-select-cell-container">
        ${repeat(values, id => {

          const option = map.get(id);

          //console.log(option);
          
          if (!option) {
            return;
          }
          const style = styleMap({
            backgroundColor: getColorByColor(option.color),
          });

          //console.log(option.link);
          if(option.link === undefined || option.link === "") 
            return html`
              <span 
                class="select-selected" 
                style=${style} >
                ${option.value}
              </span>
            `;
          
          else 
            return html`
                <span 
                  class="select-selected select-link" 
                  style=${style + ';cursor:pointer;'}
                  @click=${() => this.onJump(this, option.link)}
                  title=${"打开 " + option.value + " 页面"}>
                  ${option.value}
                </span>
              `;
        })}
      </div>
    `;
  }

  private onJump = (renderer, link: string) => { 
    // debugger;
    const ownerURL=this.ownerDocument.location.href;
    const newUrl = ownerURL.replace(/\/[^\/]*$/, "/" + link);
    window.open(newUrl, "_blank");
  }

  @property({ attribute: false })
  accessor options: SelectTag[] = [];

  @query('.affine-select-cell-container')
  accessor selectContainer!: HTMLElement;

  @property({ attribute: false })
  accessor value: string[] = [];

}

declare global {
  interface HTMLElementTagNameMap {
    'affine-data-ref-view': DataRefView;
  }
}
