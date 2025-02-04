export type ColumnType = string;
import type { DatabaseBlockModel } from '@blocksuite/affine-model';

export interface Column<
  Data extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  type: ColumnType;
  name: string;
  data: Data;
}

export type StatCalcOpType = string | undefined;

export const getAffineDatabase = (ele: HTMLElement) => {
  const element = ele.closest(
    'affine-database'
  ) as DatabaseBlockModel;
  return element;
};
