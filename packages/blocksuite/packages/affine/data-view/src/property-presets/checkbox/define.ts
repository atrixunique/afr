import { t } from '../../core/logical/type-presets.js';
import { propertyType } from '../../core/property/property-config.js';

export const checkboxPropertyType = propertyType('checkbox');

export const checkboxPropertyModelConfig =
  checkboxPropertyType.modelConfig<boolean>({
    name: '事项',
    type: () => t.boolean.instance(),
    defaultData: () => ({}),
    cellToString: ({ value }) => (value ? 'True' : 'False'),
    cellFromString: ({ value }) => {
      return {
        value: value !== 'False',
      };
    },
    cellToJson: ({ value }) => value ?? null,
    isEmpty: () => false,
    minWidth: 34,
  });