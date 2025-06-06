import { computed, type ReadonlySignal } from '@preact/signals-core';

import type { TypeInstance } from '../logical/type.js';
import type { CellRenderer } from '../property/index.js';
import type { PropertyDataUpdater } from '../types.js';
import type { UniComponent } from '../utils/uni-component/index.js';
import type { Cell } from './cell.js';
import type { SingleView } from './single-view.js';

export interface Property<
  Value = unknown,
  Data extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly id: string;
  readonly index: number;
  readonly view: SingleView;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly readonly$: ReadonlySignal<boolean>;
  readonly renderer$: ReadonlySignal<CellRenderer | undefined>;
  readonly cells$: ReadonlySignal<Cell[]>;
  readonly dataType$: ReadonlySignal<TypeInstance>;
  readonly icon?: UniComponent;

  readonly delete?: () => void;
  get canDelete(): boolean;

  readonly duplicate?: () => void;
  get canDuplicate(): boolean;



  cellGet(rowId: string): Cell<Value>;

  readonly data$: ReadonlySignal<Data>;
  dataUpdate(updater: PropertyDataUpdater<Data>): void;

  readonly type$: ReadonlySignal<string>;
  readonly typeSet?: (type: string) => void;
  get typeCanSet(): boolean;

  readonly name$: ReadonlySignal<string>;
  nameSet(name: string): void;

  readonly dataRef$: ReadonlySignal<string>;
  dataRefSet(dataRef: string): void;



  readonly hide$: ReadonlySignal<boolean>;
  hideSet(hide: boolean): void;
  get hideCanSet(): boolean;

  valueGet(rowId: string): Value | undefined;
  valueSet(rowId: string, value: Value | undefined): void;

  stringValueGet(rowId: string): string;
  valueSetFromString(rowId: string, value: string): void;
}

export abstract class PropertyBase<
  Value = unknown,
  Data extends Record<string, unknown> = Record<string, unknown>,
> implements Property<Value, Data>
{
  cells$ = computed(() => {
    return this.view.rows$.value.map(id => this.cellGet(id));
  });

  data$ = computed(() => {
    return this.view.propertyDataGet(this.id) as Data;
  });

  dataType$ = computed(() => {
    return this.view.propertyDataTypeGet(this.id)!;
  });

  hide$ = computed(() => {
    return this.view.propertyHideGet(this.id);
  });

  name$ = computed(() => {
    return this.view.propertyNameGet(this.id);
  });

  dataRef$ = computed(() => {
    return this.view.propertyDataRefGet(this.id);
  });

  readonly$ = computed(() => {
    return this.view.readonly$.value || this.view.propertyReadonlyGet(this.id);
  });

  type$ = computed(() => {
    return this.view.propertyTypeGet(this.id)!;
  });

  renderer$ = computed(() => {
    return this.view.propertyMetaGet(this.type$.value)?.renderer.cellRenderer;
  });

  get delete(): (() => void) | undefined {
    return () => this.view.propertyDelete(this.id);
  }

  get duplicate(): (() => void) | undefined {
    return () => this.view.propertyDuplicate(this.id);
  }

  get icon(): UniComponent | undefined {
    if (!this.type$.value) return undefined;
    return this.view.propertyIconGet(this.type$.value);
  }

  get id(): string {
    return this.propertyId;
  }

  get index(): number {
    return this.view.propertyIndexGet(this.id);
  }

  get isFirst(): boolean {
    return this.view.propertyIndexGet(this.id) === 0;
  }

  get isLast(): boolean {
    return (
      this.view.propertyIndexGet(this.id) ===
      this.view.properties$.value.length - 1
    );
  }

  get typeSet(): undefined | ((type: string) => void) {
    return type => this.view.propertyTypeSet(this.id, type);
  }

  constructor(
    public view: SingleView,
    public propertyId: string
  ) {}


  get canDelete(): boolean {
    return this.view.propertyCanDelete(this.id);
  }
  get canDuplicate(): boolean {
    return this.view.propertyCanDuplicate(this.id);
  }
  get typeCanSet(): boolean {
    return this.view.propertyTypeCanSet(this.id);
  }
  get hideCanSet(): boolean {
    return this.view.propertyCanHide(this.id);
  }

  cellGet(rowId: string): Cell<Value> {
    return this.view.cellGet(rowId, this.id) as Cell<Value>;
  }

  dataUpdate(updater: PropertyDataUpdater<Data>): void {
    const data = this.data$.value;
    this.view.propertyDataSet(this.id, {
      ...data,
      ...updater(data),
    });
  }

  hideSet(hide: boolean): void {
    this.view.propertyHideSet(this.id, hide);
  }

  nameSet(name: string): void {
    this.view.propertyNameSet(this.id, name);
  }

  dataRefSet(dataRef: string): void {
    this.view.propertyDataRefSet(this.id, dataRef);
  }
  
  stringValueGet(rowId: string): string {
    return this.cellGet(rowId).stringValue$.value;
  }

  valueGet(rowId: string): Value | undefined {
    return this.cellGet(rowId).value$.value;
  }

  valueSet(rowId: string, value: Value | undefined): void {
    return this.cellGet(rowId).valueSet(value);
  }

  valueSetFromString(rowId: string, value: string): void {
    const data = this.view.propertyParseValueFromString(this.id, value);
    if (!data) {
      return;
    }
    if (data.data) {
      this.dataUpdate(() => data.data as Data);
    }
    this.valueSet(rowId, data.value as Value);
  }
}
