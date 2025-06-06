import { addSiblingAttachmentBlocks } from '@blocksuite/affine-block-attachment';
import { toggleEmbedCardCreateModal } from '@blocksuite/affine-block-bookmark';
import type { DataViewBlockComponent } from '@blocksuite/affine-block-data-view';
import { insertDatabaseBlockCommand } from '@blocksuite/affine-block-database';
import {
  FigmaIcon,
  GithubIcon,
  LoomIcon,
  YoutubeIcon,
} from '@blocksuite/affine-block-embed';
import { insertImagesCommand } from '@blocksuite/affine-block-image';
import { insertLatexBlockCommand } from '@blocksuite/affine-block-latex';
import { getSurfaceBlock } from '@blocksuite/affine-block-surface';
import { insertSurfaceRefBlockCommand } from '@blocksuite/affine-block-surface-ref';
import { insertTableBlockCommand } from '@blocksuite/affine-block-table';
import {
  ArrowDownBigIcon,
  ArrowUpBigIcon,
  CopyIcon,
  DatabaseKanbanViewIcon20,
  DatabaseTableViewIcon20,
  DeleteIcon,
  FileIcon,
  FrameIcon,
  HeadingIcon,
  ImageIcon20,
  LinkedDocIcon,
  LinkIcon,
  NewDocIcon,
  NowIcon,
  TodayIcon,
  TomorrowIcon,
  YesterdayIcon,
} from '@blocksuite/affine-components/icons';
import {
  getInlineEditorByModel,
  insertContent,
  insertInlineLatex,
  textConversionConfigs,
  textFormatConfigs,
} from '@blocksuite/affine-components/rich-text';
import { toast } from '@blocksuite/affine-components/toast';
import type {
  FrameBlockModel,
  ParagraphBlockModel,
} from '@blocksuite/affine-model';
import {
  getSelectedModelsCommand,
  getTextSelectionCommand,
} from '@blocksuite/affine-shared/commands';
import { REFERENCE_NODE } from '@blocksuite/affine-shared/consts';
import {
  FeatureFlagService,
  FileSizeLimitService,
  TelemetryProvider,
} from '@blocksuite/affine-shared/services';
import {
  createDefaultDoc,
  openFileOrFiles,
} from '@blocksuite/affine-shared/utils';
import { viewPresets } from '@blocksuite/data-view/view-presets';
import { assertType } from '@blocksuite/global/utils';
import { DualLinkIcon, GroupingIcon, TeXIcon } from '@blocksuite/icons/lit';
import type { DeltaInsert } from '@blocksuite/inline';
import type { BlockModel } from '@blocksuite/store';
import { Slice, Text } from '@blocksuite/store';
import type { TemplateResult } from 'lit';

import type { RootBlockComponent } from '../../types.js';
import { formatDate, formatTime } from '../../utils/misc.js';
import type { AffineLinkedDocWidget } from '../linked-doc/index.js';
import { type SlashMenuTooltip, slashMenuToolTips } from './tooltips/index.js';
import {
  createConversionItem,
  createTextFormatItem,
  insideEdgelessText,
  tryRemoveEmptyLine,
} from './utils.js';

export type SlashMenuConfig = {
  triggerKeys: string[];
  ignoreBlockTypes: BlockSuite.Flavour[];
  items: SlashMenuItem[];
  maxHeight: number;
  tooltipTimeout: number;
};

export type SlashMenuStaticConfig = Omit<SlashMenuConfig, 'items'> & {
  items: SlashMenuStaticItem[];
};

export type SlashMenuItem = SlashMenuStaticItem | SlashMenuItemGenerator;

export type SlashMenuStaticItem =
  | SlashMenuGroupDivider
  | SlashMenuActionItem
  | SlashSubMenu;

export type SlashMenuGroupDivider = {
  groupName: string;
  showWhen?: (ctx: SlashMenuContext) => boolean;
};

export type SlashMenuActionItem = {
  name: string;
  description?: string;
  icon?: TemplateResult;
  tooltip?: SlashMenuTooltip;
  alias?: string[];
  showWhen?: (ctx: SlashMenuContext) => boolean;
  action: (ctx: SlashMenuContext) => void | Promise<void>;

  customTemplate?: TemplateResult<1>;
};

export type SlashSubMenu = {
  name: string;
  description?: string;
  icon?: TemplateResult;
  alias?: string[];
  showWhen?: (ctx: SlashMenuContext) => boolean;
  subMenu: SlashMenuStaticItem[];
};

export type SlashMenuItemGenerator = (
  ctx: SlashMenuContext
) => (SlashMenuGroupDivider | SlashMenuActionItem | SlashSubMenu)[];

export type SlashMenuContext = {
  rootComponent: RootBlockComponent;
  model: BlockModel;
};

export const defaultSlashMenuConfig: SlashMenuConfig = {
  triggerKeys: ['/'],
  ignoreBlockTypes: ['affine:code'],
  maxHeight: 344,
  tooltipTimeout: 800,
  items: [
    // ---------------------------------------------------------
    { groupName: '基本' },
    ...textConversionConfigs
      .filter(i => i.type && ['h1', 'h2', 'h3', 'text'].includes(i.type))
      .map(createConversionItem),
    {
      name: 'Other Headings',
      icon: HeadingIcon,
      subMenu: [
        { groupName: 'Headings' },
        ...textConversionConfigs
          .filter(i => i.type && ['h4', 'h5', 'h6'].includes(i.type))
          .map<SlashMenuActionItem>(createConversionItem),
      ],
    },
    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:code')
      .map<SlashMenuActionItem>(createConversionItem),

    ...textConversionConfigs
      .filter(i => i.type && ['divider', 'quote'].includes(i.type))
      .map<SlashMenuActionItem>(config => ({
        ...createConversionItem(config),
        showWhen: ({ model }) =>
          model.doc.schema.flavourSchemaMap.has(config.flavour) &&
          !insideEdgelessText(model),
      })),

    // {
    //   name: 'Inline equation',
    //   description: 'Create a equation block.',
    //   icon: TeXIcon({
    //     width: '20',
    //     height: '20',
    //   }),
    //   alias: ['inlineMath, inlineEquation', 'inlineLatex'],
    //   action: ({ rootComponent }) => {
    //     rootComponent.std.command
    //       .chain()
    //       .pipe(getTextSelectionCommand)
    //       .pipe(insertInlineLatex)
    //       .run();
    //   },
    // },

    // ---------------------------------------------------------
    { groupName: '列表' },
    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:list')
      .map(createConversionItem),

    // ---------------------------------------------------------
    // { groupName: '样式' },
    // ...textFormatConfigs
    //   .filter(i => !['Code', 'Link'].includes(i.name))
    //   .map<SlashMenuActionItem>(createTextFormatItem),

    // ---------------------------------------------------------
    {
      groupName: '页面',
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-linked-doc'),
    },
    {
      name: 'New Doc',
      description: '新建空白页面',
      icon: NewDocIcon,
      tooltip: slashMenuToolTips['New Doc'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-linked-doc'),
      action: ({ rootComponent, model }) => {
        const newDoc = createDefaultDoc(rootComponent.doc.workspace);
        insertContent(rootComponent.host, model, REFERENCE_NODE, {
          reference: {
            type: 'LinkedPage',
            pageId: newDoc.id,
          },
        });
      },
    },
    // {
    //   name: 'Linked Doc',
    //   description: '新建页面链接',
    //   icon: LinkedDocIcon,
    //   tooltip: slashMenuToolTips['Linked Doc'],
    //   alias: ['dual link'],
    //   showWhen: ({ rootComponent, model }) => {
    //     const { std } = rootComponent;
    //     const linkedDocWidget = std.view.getWidget(
    //       'affine-linked-doc-widget',
    //       rootComponent.model.id
    //     );

    //     if (!linkedDocWidget) return false;

    //     return model.doc.schema.flavourSchemaMap.has('affine:embed-linked-doc');
    //   },
    //   action: ({ model, rootComponent }) => {
    //     const { std } = rootComponent;
        
    //     const linkedDocWidget = std.view.getWidget(
    //       'affine-linked-doc-widget',
    //       rootComponent.model.id
    //     );
    //     if (!linkedDocWidget) return;
    //     assertType<AffineLinkedDocWidget>(linkedDocWidget);

    //     const triggerKey = linkedDocWidget.config.triggerKeys[0];

    //     insertContent(rootComponent.host, model, triggerKey);

    //     const inlineEditor = getInlineEditorByModel(rootComponent.host, model);
    //     // Wait for range to be updated
    //     inlineEditor?.slots.inlineRangeSync.once(() => {
    //       linkedDocWidget.show({ addTriggerKey: true });
    //     });
    //   },
    // },

    // ---------------------------------------------------------
    { groupName: '富文本内容' },
    // {
    //   name: 'Table',
    //   description: 'Create a table block.',
    //   icon: DatabaseTableViewIcon20,
    //   tooltip: slashMenuToolTips['Table View'],
    //   showWhen: ({ model }) => !insideEdgelessText(model),
    //   action: ({ rootComponent }) => {
    //     rootComponent.std.command
    //       .chain()
    //       .pipe(getSelectedModelsCommand)
    //       .pipe(insertTableBlockCommand, {
    //         place: 'after',
    //         removeEmptyLine: true,
    //       })
    //       .run();
    //   },
    // },
    {
      name: 'Image',
      description: '插入图片',
      icon: ImageIcon20,
      tooltip: slashMenuToolTips['Image'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:image'),
      action: async ({ rootComponent }) => {
        const [success, ctx] = rootComponent.std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertImagesCommand, { removeEmptyLine: true })
          .run();

        if (success) await ctx.insertedImageIds;
      },
    },
    // {
    //   name: 'Link',
    //   description: '新建页面链接',
    //   icon: LinkIcon,
    //   tooltip: slashMenuToolTips['Link'],
    //   showWhen: ({ model }) =>
    //     model.doc.schema.flavourSchemaMap.has('affine:bookmark'),
    //   action: async ({ rootComponent, model }) => {

    //     const parentModel = rootComponent.doc.getParent(model);
    //     if (!parentModel) {
    //       return;
    //     }

    //     const index = parentModel.children.indexOf(model) + 1;
    //     await toggleEmbedCardCreateModal(
    //       rootComponent.host,
    //       'Links',
    //       'The added link will be displayed as a card view.',
    //       { mode: 'page', parentModel, index }
    //     );
    //     tryRemoveEmptyLine(model);
    //   },
    // },
    {
      name: 'Attachment',
      description: '插入文件附件',
      icon: FileIcon,
      tooltip: slashMenuToolTips['Attachment'],
      alias: ['file'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:attachment'),
      action: async ({ rootComponent, model }) => {
        const file = await openFileOrFiles();
        if (!file) return;

        const maxFileSize =
          rootComponent.std.store.get(FileSizeLimitService).maxFileSize;

        await addSiblingAttachmentBlocks(
          rootComponent.host,
          [file],
          maxFileSize,
          model
        );
        tryRemoveEmptyLine(model);
      },
    },
    // {
    //   name: 'YouTube',
    //   description: 'Embed a YouTube video.',
    //   icon: YoutubeIcon,
    //   tooltip: slashMenuToolTips['YouTube'],
    //   showWhen: ({ model }) =>
    //     model.doc.schema.flavourSchemaMap.has('affine:embed-youtube'),
    //   action: async ({ rootComponent, model }) => {
    //     const parentModel = rootComponent.doc.getParent(model);
    //     if (!parentModel) {
    //       return;
    //     }
    //     const index = parentModel.children.indexOf(model) + 1;
    //     await toggleEmbedCardCreateModal(
    //       rootComponent.host,
    //       'YouTube',
    //       'The added YouTube video link will be displayed as an embed view.',
    //       { mode: 'page', parentModel, index }
    //     );
    //     tryRemoveEmptyLine(model);
    //   },
    // },
    // {
    //   name: 'GitHub',
    //   description: 'Link to a GitHub repository.',
    //   icon: GithubIcon,
    //   tooltip: slashMenuToolTips['Github'],
    //   showWhen: ({ model }) =>
    //     model.doc.schema.flavourSchemaMap.has('affine:embed-github'),
    //   action: async ({ rootComponent, model }) => {
    //     const parentModel = rootComponent.doc.getParent(model);
    //     if (!parentModel) {
    //       return;
    //     }
    //     const index = parentModel.children.indexOf(model) + 1;
    //     await toggleEmbedCardCreateModal(
    //       rootComponent.host,
    //       'GitHub',
    //       'The added GitHub issue or pull request link will be displayed as a card view.',
    //       { mode: 'page', parentModel, index }
    //     );
    //     tryRemoveEmptyLine(model);
    //   },
    // },
    // // TODO: X Twitter

    // {
    //   name: 'Figma',
    //   description: 'Embed a Figma document.',
    //   icon: FigmaIcon,
    //   tooltip: slashMenuToolTips['Figma'],
    //   showWhen: ({ model }) =>
    //     model.doc.schema.flavourSchemaMap.has('affine:embed-figma'),
    //   action: async ({ rootComponent, model }) => {
    //     const parentModel = rootComponent.doc.getParent(model);
    //     if (!parentModel) {
    //       return;
    //     }
    //     const index = parentModel.children.indexOf(model) + 1;
    //     await toggleEmbedCardCreateModal(
    //       rootComponent.host,
    //       'Figma',
    //       'The added Figma link will be displayed as an embed view.',
    //       { mode: 'page', parentModel, index }
    //     );
    //     tryRemoveEmptyLine(model);
    //   },
    // },

    // {
    //   name: 'Loom',
    //   icon: LoomIcon,
    //   showWhen: ({ model }) =>
    //     model.doc.schema.flavourSchemaMap.has('affine:embed-loom'),
    //   action: async ({ rootComponent, model }) => {
    //     const parentModel = rootComponent.doc.getParent(model);
    //     if (!parentModel) {
    //       return;
    //     }
    //     const index = parentModel.children.indexOf(model) + 1;
    //     await toggleEmbedCardCreateModal(
    //       rootComponent.host,
    //       'Loom',
    //       'The added Loom video link will be displayed as an embed view.',
    //       { mode: 'page', parentModel, index }
    //     );
    //     tryRemoveEmptyLine(model);
    //   },
    // },

    // {
    //   name: 'Equation',
    //   description: 'Create a equation block.',
    //   icon: TeXIcon({
    //     width: '20',
    //     height: '20',
    //   }),
    //   alias: ['mathBlock, equationBlock', 'latexBlock'],
    //   action: ({ rootComponent }) => {
    //     rootComponent.std.command
    //       .chain()
    //       .pipe(getSelectedModelsCommand)
    //       .pipe(insertLatexBlockCommand, {
    //         place: 'after',
    //         removeEmptyLine: true,
    //       })
    //       .run();
    //   },
    // },

    // TODO(@L-Sun): Linear

    // ---------------------------------------------------------
    // ({ model, rootComponent }) => {
    //   const { doc } = rootComponent;

    //   const surfaceModel = getSurfaceBlock(doc);
    //   if (!surfaceModel) return [];

    //   const parent = doc.getParent(model);
    //   if (!parent) return [];

    //   const frameModels = doc
    //     .getBlocksByFlavour('affine:frame')
    //     .map(block => block.model as FrameBlockModel);

    //   const frameItems = frameModels.map<SlashMenuActionItem>(frameModel => ({
    //     name: 'Frame: ' + frameModel.title,
    //     icon: FrameIcon,
    //     action: ({ rootComponent }) => {
    //       rootComponent.std.command
    //         .chain()
    //         .pipe(getSelectedModelsCommand)
    //         .pipe(insertSurfaceRefBlockCommand, {
    //           reference: frameModel.id,
    //           place: 'after',
    //           removeEmptyLine: true,
    //         })
    //         .run();
    //     },
    //   }));

    //   const groupElements = surfaceModel.getElementsByType('group');
    //   const groupItems = groupElements.map(group => ({
    //     name: 'Group: ' + group.title.toString(),
    //     icon: GroupingIcon(),
    //     action: () => {
    //       rootComponent.std.command
    //         .chain()
    //         .pipe(getSelectedModelsCommand)
    //         .pipe(insertSurfaceRefBlockCommand, {
    //           reference: group.id,
    //           place: 'after',
    //           removeEmptyLine: true,
    //         })
    //         .run();
    //     },
    //   }));

    //   const items = [...frameItems, ...groupItems];
    //   if (items.length !== 0) {
    //     return [
    //       {
    //         groupName: 'Document Group & Frame',
    //       },
    //       ...items,
    //     ];
    //   } else {
    //     return [];
    //   }
    // },

    // ---------------------------------------------------------
    // { groupName: 'Date' },
    // () => {
    //   const now = new Date();
    //   const tomorrow = new Date();
    //   const yesterday = new Date();

    //   yesterday.setDate(yesterday.getDate() - 1);
    //   tomorrow.setDate(tomorrow.getDate() + 1);

    //   return [
    //     {
    //       name: 'Today',
    //       icon: TodayIcon,
    //       tooltip: slashMenuToolTips['Today'],
    //       description: formatDate(now),
    //       action: ({ rootComponent, model }) => {
    //         insertContent(rootComponent.host, model, formatDate(now));
    //       },
    //     },
    //     {
    //       name: 'Tomorrow',
    //       icon: TomorrowIcon,
    //       tooltip: slashMenuToolTips['Tomorrow'],
    //       description: formatDate(tomorrow),
    //       action: ({ rootComponent, model }) => {
    //         const tomorrow = new Date();
    //         tomorrow.setDate(tomorrow.getDate() + 1);
    //         insertContent(rootComponent.host, model, formatDate(tomorrow));
    //       },
    //     },
    //     {
    //       name: 'Yesterday',
    //       icon: YesterdayIcon,
    //       tooltip: slashMenuToolTips['Yesterday'],
    //       description: formatDate(yesterday),
    //       action: ({ rootComponent, model }) => {
    //         const yesterday = new Date();
    //         yesterday.setDate(yesterday.getDate() - 1);
    //         insertContent(rootComponent.host, model, formatDate(yesterday));
    //       },
    //     },
    //     {
    //       name: 'Now',
    //       icon: NowIcon,
    //       tooltip: slashMenuToolTips['Now'],
    //       description: formatTime(now),
    //       action: ({ rootComponent, model }) => {
    //         insertContent(rootComponent.host, model, formatTime(now));
    //       },
    //     },
    //   ];
    // },

    // ---------------------------------------------------------
    { groupName: '数据库' },
    {
      name: '新建数据库',
      description: '建立一个表格型数据库.',
      alias: ['database'],
      icon: DatabaseTableViewIcon20,
      tooltip: slashMenuToolTips['Table View'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:database') &&
        !insideEdgelessText(model),
      action: ({ rootComponent }) => {
        rootComponent.std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertDatabaseBlockCommand, {
            viewType: viewPresets.tableViewMeta.type,
            place: 'after',
            removeEmptyLine: true,
          })
          .pipe(({ insertedDatabaseBlockId }) => {
            if (insertedDatabaseBlockId) {
              const telemetry =
                rootComponent.std.getOptional(TelemetryProvider);
              telemetry?.track('AddDatabase', {
                blockId: insertedDatabaseBlockId,
              });
            }
          })
          .run();
      },
    },
    {
      name: 'Todo',
      alias: ['todo view'],
      icon: DatabaseTableViewIcon20,
      tooltip: slashMenuToolTips['Todo'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:database') &&
        !insideEdgelessText(model) &&
        !!model.doc.get(FeatureFlagService).getFlag('enable_block_query'),

      action: ({ model, rootComponent }) => {


        const parent = rootComponent.doc.getParent(model);
        if (!parent) return;
        const index = parent.children.indexOf(model);
        const id = rootComponent.doc.addBlock(
          'affine:data-view',
          {},
          rootComponent.doc.getParent(model),
          index + 1
        );
        const dataViewModel = rootComponent.doc.getBlock(id)!;

        Promise.resolve()
          .then(() => {
            const dataView = rootComponent.std.view.getBlock(
              dataViewModel.id
            ) as DataViewBlockComponent | null;
            dataView?.dataSource.viewManager.viewAdd('table');
          })
          .catch(console.error);
        tryRemoveEmptyLine(model);
      },
    },
    // {
    //   name: 'Kanban View',
    //   description: 'Visualize data in a dashboard.',
    //   alias: ['database'],
    //   icon: DatabaseKanbanViewIcon20,
    //   tooltip: slashMenuToolTips['Kanban View'],
    //   showWhen: ({ model }) =>
    //     model.doc.schema.flavourSchemaMap.has('affine:database') &&
    //     !insideEdgelessText(model),
    //   action: ({ rootComponent }) => {
    //     rootComponent.std.command
    //       .chain()
    //       .pipe(getSelectedModelsCommand)
    //       .pipe(insertDatabaseBlockCommand, {
    //         viewType: viewPresets.kanbanViewMeta.type,
    //         place: 'after',
    //         removeEmptyLine: true,
    //       })
    //       .pipe(({ insertedDatabaseBlockId }) => {
    //         if (insertedDatabaseBlockId) {
    //           const telemetry =
    //             rootComponent.std.getOptional(TelemetryProvider);
    //           telemetry?.track('AddDatabase', {
    //             blockId: insertedDatabaseBlockId,
    //           });
    //         }
    //       })
    //       .run();
    //   },
    // },

    // ---------------------------------------------------------
    // { groupName: 'Actions' },
    // {
    //   name: 'Move Up',
    //   description: 'Shift this line up.',
    //   icon: ArrowUpBigIcon,
    //   tooltip: slashMenuToolTips['Move Up'],
    //   action: ({ rootComponent, model }) => {
    //     const doc = rootComponent.doc;
    //     const previousSiblingModel = doc.getPrev(model);
    //     if (!previousSiblingModel) return;

    //     const parentModel = doc.getParent(previousSiblingModel);
    //     if (!parentModel) return;

    //     doc.moveBlocks([model], parentModel, previousSiblingModel, true);
    //   },
    // },
    // {
    //   name: 'Move Down',
    //   description: 'Shift this line down.',
    //   icon: ArrowDownBigIcon,
    //   tooltip: slashMenuToolTips['Move Down'],
    //   action: ({ rootComponent, model }) => {
    //     const doc = rootComponent.doc;
    //     const nextSiblingModel = doc.getNext(model);
    //     if (!nextSiblingModel) return;

    //     const parentModel = doc.getParent(nextSiblingModel);
    //     if (!parentModel) return;

    //     doc.moveBlocks([model], parentModel, nextSiblingModel, false);
    //   },
    // },
    // {
    //   name: 'Copy',
    //   description: 'Copy this line to clipboard.',
    //   icon: CopyIcon,
    //   tooltip: slashMenuToolTips['Copy'],
    //   action: ({ rootComponent, model }) => {
    //     const slice = Slice.fromModels(rootComponent.std.store, [model]);

    //     rootComponent.std.clipboard
    //       .copy(slice)
    //       .then(() => {
    //         toast(rootComponent.host, 'Copied to clipboard');
    //       })
    //       .catch(e => {
    //         console.error(e);
    //       });
    //   },
    // },
    // {
    //   name: 'Duplicate',
    //   description: 'Create a duplicate of this line.',
    //   icon: DualLinkIcon({ width: '20', height: '20' }),
    //   tooltip: slashMenuToolTips['Copy'],
    //   action: ({ rootComponent, model }) => {
    //     if (!model.text || !(model.text instanceof Text)) {
    //       console.error("Can't duplicate a block without text");
    //       return;
    //     }
    //     const parent = rootComponent.doc.getParent(model);
    //     if (!parent) {
    //       console.error(
    //         'Failed to duplicate block! Parent not found: ' +
    //           model.id +
    //           '|' +
    //           model.flavour
    //       );
    //       return;
    //     }
    //     const index = parent.children.indexOf(model);

    //     // TODO add clone model util
    //     rootComponent.doc.addBlock(
    //       model.flavour as never,
    //       {
    //         type: (model as ParagraphBlockModel).type,
    //         text: new Text(model.text.toDelta() as DeltaInsert[]),
    //         // @ts-expect-error FIXME: ts error
    //         checked: model.checked,
    //       },
    //       rootComponent.doc.getParent(model),
    //       index
    //     );
    //   },
    // },
    // {
    //   name: 'Delete',
    //   description: 'Remove this line permanently.',
    //   alias: ['remove'],
    //   icon: DeleteIcon,
    //   tooltip: slashMenuToolTips['Delete'],
    //   action: ({ rootComponent, model }) => {
    //     rootComponent.doc.deleteBlock(model);
    //   },
    // },
  ],
};
