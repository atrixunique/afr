import { checkboxPropertyConfig } from './checkbox/cell-renderer.js';
import { dataRefPropertyConfig } from './data-ref/cell-renderer.js';
import { datePropertyConfig } from './date/cell-renderer.js';
import { imagePropertyConfig } from './image/cell-renderer.js';
import { multiSelectPropertyConfig } from './multi-select/cell-renderer.js';
import { numberPropertyConfig } from './number/cell-renderer.js';
import { progressPropertyConfig } from './progress/cell-renderer.js';
import { selectPropertyConfig } from './select/cell-renderer.js';
import { textPropertyConfig } from './text/cell-renderer.js';

export * from './converts.js';
export * from './data-ref/define.js';
export * from './number/types.js';
export * from './select/define.js';
export const propertyPresets = {
  checkboxPropertyConfig,
  dataRefPropertyConfig,
  datePropertyConfig,
  imagePropertyConfig,
  multiSelectPropertyConfig,
  numberPropertyConfig,
  progressPropertyConfig,
  selectPropertyConfig,
  textPropertyConfig,
};
