import type { PropertyMetaConfig } from '@blocksuite/data-view';

import { propertyPresets } from '@blocksuite/data-view/property-presets';

import { linkColumnConfig } from './link/cell-renderer.js';
import { richTextColumnConfig } from './rich-text/cell-renderer.js';
import { titleColumnConfig } from './title/cell-renderer.js';

export * from './converts.js';
const {
  checkboxPropertyConfig,
  datePropertyConfig,
  multiSelectPropertyConfig,
  numberPropertyConfig,
  progressPropertyConfig,
  selectPropertyConfig,
  dataRefPropertyConfig,
} = propertyPresets;
export const databaseBlockColumns = {
  checkboxColumnConfig: checkboxPropertyConfig,
  dateColumnConfig: datePropertyConfig,
  multiSelectColumnConfig: multiSelectPropertyConfig,
  numberColumnConfig: numberPropertyConfig,
  progressColumnConfig: progressPropertyConfig,
  selectColumnConfig: selectPropertyConfig,
  linkColumnConfig,
  richTextColumnConfig,
  dataRefPropertyConfig,
};
export const databaseBlockPropertyList = Object.values(databaseBlockColumns);
export const databaseBlockHiddenColumns = [
  propertyPresets.imagePropertyConfig,
  titleColumnConfig,
];
const databaseBlockAllColumns = [
  ...databaseBlockPropertyList,
  ...databaseBlockHiddenColumns,
];
export const databaseBlockAllPropertyMap = Object.fromEntries(
  databaseBlockAllColumns.map(v => [v.type, v as PropertyMetaConfig])
);