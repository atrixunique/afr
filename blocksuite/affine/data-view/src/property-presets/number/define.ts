import { t } from '../../core/logical/type-presets.js';
import { propertyType } from '../../core/property/property-config.js';
import type { NumberPropertyDataType } from './types.js';

export const numberPropertyType = propertyType('number');

export const numberPropertyModelConfig = numberPropertyType.modelConfig<
  number,
  NumberPropertyDataType
>({
  name: '数字',
  type: () => t.number.instance(),
  defaultData: () => ({ decimal: 0, format: 'number' }),
  cellToString: ({ value }) => value?.toString() ?? '',
  cellFromString: ({ value }) => {
    const num = value ? Number(value) : NaN;
    return {
      value: isNaN(num) ? null : num,
    };
  },
  cellToJson: ({ value }) => value ?? null,
  cellFromJson: ({ value }) => (typeof value !== 'number' ? undefined : value),
  isEmpty: ({ value }) => value == null,
});
