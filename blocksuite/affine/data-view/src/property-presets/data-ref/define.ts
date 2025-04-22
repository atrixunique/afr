import { nanoid } from '@blocksuite/store';

import type { SelectPropertyData } from '../select/define.js';

import { getTagColor } from '../../core/component/tags/colors.js';
import { type SelectTag, t } from '../../core/index.js';
import { propertyType } from '../../core/property/property-config.js';

export const dataRefPropertyType = propertyType('data-ref');
export const dataRefPropertyModelConfig = dataRefPropertyType.modelConfig<
  string[],
  SelectPropertyData
>({
  name: '数据表链接',
  type: ({ data }) => t.array.instance(t.tag.instance(data.options)),
  defaultData: () => ({
    options: [],
  }),
  addGroup: ({ text, oldData }) => {
    return {
      options: [
        ...(oldData.options ?? []),
        {
          id: nanoid(),
          value: text,
          color: getTagColor(),
        },
      ],
    };
  },
  formatValue: ({ value }) => {
    if (Array.isArray(value)) {
      return value.filter(v => v != null);
    }
    return [];
  },
  // cellToString: ({ value, data }) =>
  //   value?.map(id => data.options.find(v => v.id === id)?.value).join(','),
  cellToString: ({ value, data }) => 
    value?.filter(item => item.includes('-')).map(item => item.split('-')[1]).join(','),
  cellFromString: ({ value: oldValue, data }) => {
    const optionMap = Object.fromEntries(data.options.map(v => [v.value, v]));
    const optionNames = oldValue
      .split(',')
      .map(v => v.trim())
      .filter(v => v);

    const value: string[] = [];
    optionNames.forEach(name => {
      if (!optionMap[name]) {
        const newOption: SelectTag = {
          id: nanoid(),
          value: name,
          color: getTagColor(),
        };
        data.options.push(newOption);
        value.push(newOption.id);
      } else {
        value.push(optionMap[name].id);
      }
    });

    return {
      value,
      data: data,
    };
  },
  cellFromJson: ({ value, data }) => {
    if (!value) return [];
    const optionMap = Object.fromEntries(data.options.map(v => [v.id, v]));
    return value
      .map(id => optionMap[id])
      .filter(option => option != null)
      .map(option => option.id);
  },
  cellToJson: ({ value }) => value ?? null,
  isEmpty: ({ value }) => value == null || value.length === 0,
});
