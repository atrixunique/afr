import { propertyType, t } from '@blocksuite/data-view';
import { Text } from '@blocksuite/store';

import { type RichTextCellType, toYText } from '../utils.js';

export const richTextColumnType = propertyType('rich-text');

export const richTextColumnModelConfig =
  richTextColumnType.modelConfig<RichTextCellType>({
    name: '文本',
    type: () => t.richText.instance(),
    defaultData: () => ({}),
    cellToString: ({ value }) => value?.toString() ?? '',
    cellFromString: ({ value }) => {
      return {
        value: new Text(value),
      };
    },
    cellToJson: ({ value }) => value?.toString() ?? null,
    onUpdate: ({ value, callback }) => {
      const yText = toYText(value);
      yText.observe(callback);
      callback();
      return {
        dispose: () => {
          yText.unobserve(callback);
        },
      };
    },
    isEmpty: ({ value }) => value == null || value.length === 0,
    values: ({ value }) => (value?.toString() ? [value.toString()] : []),
  });