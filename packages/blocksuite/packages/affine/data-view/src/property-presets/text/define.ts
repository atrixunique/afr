import { t } from '../../core/index.js';
import { propertyType } from '../../core/property/property-config.js';

export const textPropertyType = propertyType('text');

export const textPropertyModelConfig = textPropertyType.modelConfig<string>({
  name: '文本',
  type: () => t.string.instance(),
  defaultData: () => ({}),
  cellToString: ({ value }) => value ?? '',
  cellFromString: ({ value }) => {
    return {
      value: value,
    };
  },
  cellToJson: ({ value }) => value ?? null,
  isEmpty: ({ value }) => value == null || value.length === 0,
});