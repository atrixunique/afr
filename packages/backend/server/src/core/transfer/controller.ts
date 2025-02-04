import {
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';

import { chunk } from 'lodash-es';
import * as Y from 'yjs';
import { applyUpdate, Doc } from 'yjs';

import { Injectable, SetMetadata } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaClient, WorkspaceMemberStatus } from '@prisma/client';

import { type BlockModel, nanoid, Text } from '@blocksuite/store';
import type { DeltaInsert } from '@blocksuite/inline';
import type { AffineTextAttributes } from '@blocksuite/affine/blocks';

// import { UserService } from '../user';
import { PermissionService } from '../permission';
import { DocContentService} from "../doc-renderer"
import { PgWorkspaceDocStorageAdapter} from '../doc';
import { EventEmitter} from '../../base';

import { DocsService, useService} from '@toeverything/infra';

// import { track } from '@affine/track';

import {
  type PageDocContent,
  parsePageDoc,
  parseWorkspaceDoc,
  type WorkspaceDocContent,
} from '../utils/blocksuite';

interface AtrixResponse {
  registered: boolean; 
  hasPassword: boolean;
}

const PUBLIC_ENTRYPOINT_SYMBOL = Symbol('public');
export const Public = () => SetMetadata(PUBLIC_ENTRYPOINT_SYMBOL, true);

type KnownFlavour =
  | 'affine:page'
  | 'affine:note'
  | 'affine:surface'
  | 'affine:paragraph'
  | 'affine:list'
  | 'affine:code'
  | 'affine:image';

  
@Public()
@Controller('/api/transfer')
export class TransferController {
  constructor(
    // private readonly transfer: TransferService,
    // private readonly user: UserService,
    private readonly permission: PermissionService,
    private readonly db: PrismaClient,
    private readonly doc:DocContentService,
    private readonly workspace: PgWorkspaceDocStorageAdapter,
    private readonly event: EventEmitter,
  ) { }

  const example=
    [
      { 'Time':'Task A',
        'Source':'facebook',
        'Title':'title',
        'Content':'content',
        'Remark':'remark',
      },
      { 'Time':'Task B',
        'Source':'facebook',
        'Title':'title',
        'Content':'content2',
        'Remark':'remark2',
      },
    ];

    
  @Public()
  @Post('/test')
  async preflight(
    @Body() params?: { workspaceId:string, guid:string}
  ): Promise {

    // const timestamp:Date = new Date();
    // const user = await this.user.findUserByEmail("dev@affine.pro");
    // const workspaces = await this.permission.getOwnedWorkspaces(user.id);

    const docRecord = await this.workspace.getDoc(params.workspaceId, params.guid);
    if (!docRecord) {
      return null;
    }
    
    const doc = new Doc();
    applyUpdate(doc, docRecord.bin);
    
    const blocks = doc.getMap<Map<any>>('blocks');
    
    const block1=blocks.get('STmqb9O5uqyWPFqNBo4fR').get('sys:children');
    console.log(block1.constructor.name);
    console.log(block1.get(1).constructor.name);



    // const block1=blocks.get('4ZczHmff496D5855P2sNK').get('prop:text');
    // const block2=blocks.get('gOjL_PGMtKy2HqrooRYK7').get('prop:text');
    // const d1: DeltaInsert<AffineTextAttributes>[]=block1.toDelta();
    // const d2: DeltaInsert<AffineTextAttributes>[]=block2.toDelta();
    // console.log(d1);
    // console.log(d2);

    // console.log(Array.from(block.keys()));
 
    // console.log('type of prop:text:'+block.get('prop:text').constructor.name);
    
    // const deltas: DeltaInsert<AffineTextAttributes>[] = block.get('prop:text').toDelta();

   
    
    
    // const deltas: DeltaInsert<AffineTextAttributes>[] = block.get('prop:text').toDelta();

    // console.log(deltas[0].attributes.reference);
    // --> { type: 'LinkedPage', pageId: 'T1y_QuVDkEbdPro9MpYfv' }    

    // console.log(Array.from(blocks.keys()));



    return blocks;
  }

  @Public()
  @Post('/empty')
  async emptyDatabase(
    @Body() params?: { workspaceId:string, guid:string, dbname:string }
  ): Promise {

    const docRecord = await this.workspace.getDoc(params.workspaceId, params.guid);
    if (!docRecord) {
      return null;
    }
    const doc = new Doc();
    applyUpdate(doc, docRecord.bin);
    const blocks = doc.getMap<Map<any>>('blocks');
  
    for (const block of blocks.values()) {
      const flavour = block.get('sys:flavour') as KnownFlavour;
      
      if (flavour === 'affine:database'  && block.get('prop:title').toString()===params.dbname) {   
        //inside a database block
        const children = block.get('sys:children') as Y.Array;
        children.toArray().map((key)=>{
            blocks.delete(key);
        });
  
        block.set('sys:children', new Y.Array());
        block.set('prop:cells', new Y.Map());
  
      }
    }
  
    const serializedState = Y.encodeStateAsUpdate(doc);
        docRecord.bin=serializedState;
        docRecord.timestamp=Date.now();
        
        await this.workspace.setDocSnapshot(docRecord);
        
        this.event.emit('snapshot.updated', {
          workspaceId: params.workspaceId,
          id: params.guid,
        });
    return 'Empty OK';
  }


  @Public()
  @Post('/getWsId')
  async getWorkspaceId(
  ): Promise {  
    return this.getMainWorkspace();
  }

  @Public()
  @Post('/AddUserPost')
  async AddUserPost(
    @Body() params?: { 
      workspaceId:string, 
      realName:string, 
      time:string, 
      platform:string, 
      account:string, 
      title:string, 
      content:string, 
      url:string, 
      numComment:string, 
      numLike:string, 
      numForward:string, 
    }
  ): Promise {

    const ws=await this.getMainWorkspace();
    const snapshotIds = await this.db.snapshot.findMany({
      where: {
        workspaceId: ws, // 查询条件
      },
      select: {
        id: true, // 只选择 id 列
      },
      orderBy: {
        updatedAt: 'desc', // 按 updatedAt 倒序排列
      },
    });
    
    // 将结果提取为一个数组，仅包含 id 的值
    const ids = snapshotIds.map(snapshot => snapshot.id);
    for (const id of ids) {
      const data=await this.doc.getPageContent(ws, id);
      
      //找到了对应的Page
      if(data?.title?.toString()==="@"+params.realName) {
        const docRecord = await this.workspace.getDoc(ws, id);

        const doc = new Doc();
        applyUpdate(doc, docRecord.bin);
        const blocks = doc.getMap<Map<any>>('blocks');

        for (const block of blocks.values()) {
          const flavour = block.get('sys:flavour') as KnownFlavour;         
          if (flavour === 'affine:database'  && block.get('prop:title').toString()==="update-"+params.realName) {      

            const children = block.get('sys:children') as Y.Array;
            const columns = block.get('prop:columns') as Y.Array;
            const cells = block.get('prop:cells') as Y.Map;
            
            const props={};
            columns.toArray().forEach(item => {
              props[item.get('name').slice(0,2)] = item.get('id');
            });

            const newUid = this.generateGuid();
            const cellRow = new Y.Map();

            const mPlatform =  new Y.Map();
            const mAccount =  new Y.Map();
            const mTitle =  new Y.Map();
            const mContent =  new Y.Map();
            const mUrl =  new Y.Map();
            const mNum =  new Y.Map();

            const yPlatform =  new Y.Text();
            const yAccount =  new Y.Text();
            const yTitle =  new Y.Text();
            const yContent =  new Y.Text();
            const yUrl =  new Y.Text();
            const yNum =  new Y.Text();

            yPlatform.insert(0,params.platform);
            yAccount.insert(0,params.account);
            yTitle.insert(0,params.title);
            yContent.insert(0,params.content);
            yUrl.insert(0,params.url);
            yNum.insert(0,params.numComment+'/'+params.numLike+'/'+params.numForward);

            mPlatform.set('columnId', props['平台']);
            mPlatform.set('value', yPlatform);
            cellRow.set(props['平台'], mPlatform);

            mAccount.set('columnId', props['账号']);
            mAccount.set('value', yAccount);
            cellRow.set(props['账号'], mAccount);

            mTitle.set('columnId', props['标题']);
            mTitle.set('value', yTitle);
            cellRow.set(props['标题'], mTitle);

            mContent.set('columnId', props['内容']);
            mContent.set('value', yContent);
            cellRow.set(props['内容'], mContent);

            mUrl.set('columnId', props['网址']);
            mUrl.set('value', yUrl);
            cellRow.set(props['网址'], mUrl);

            mNum.set('columnId', props['评论']);
            mNum.set('value', yNum);
            cellRow.set(props['评论'], mNum);
    
            cells.set(newUid, cellRow);
            children.push([newUid]);
            
            const extraMap=new Y.Map();
            extraMap.set('sys:id',newUid);
            extraMap.set('sys:flavour','affine:paragraph');
            extraMap.set('sys:version',1);
            extraMap.set('sys:children',new Y.Array());
            extraMap.set('prop:type','text');

            const yTime=new Y.Text();
            yTime.insert(0, params.time);
            extraMap.set('prop:text',yTime);
            
            blocks.set(newUid, extraMap);


            const serializedState = Y.encodeStateAsUpdate(doc);
            docRecord.bin=serializedState;
            docRecord.timestamp=Date.now();
            
            await this.workspace.setDocSnapshot(docRecord);
            
            this.event.emit('snapshot.updated', {
              workspaceId: ws,
              id: id,
            });
          }
        }
        return 'Add OK';
      }
    }
  }



  @Public()
  @Post('/newPage')
  async newOrModifyPage(
    @Body() params?: { workspaceId:string, guid:string, dbname:string, newData:[]}
  ): Promise {

    
  }

  @Public()
  @Post('/add')
  async addDatabaseRecord(
    @Body() params?: { workspaceId:string, guid:string, dbname:string, newData:[]}
  ): Promise {
    
    const docRecord = await this.workspace.getDoc(params.workspaceId, params.guid);
    if (!docRecord) {
      return null;
    }

    const doc = new Doc();
    applyUpdate(doc, docRecord.bin);
    const blocks = doc.getMap<Map<any>>('blocks');

    for (const block of blocks.values()) {
      const flavour = block.get('sys:flavour') as KnownFlavour;
      // console.log(flavour);
      // console.log('Is block a Y.Map:', block instanceof Y.Map);
      
      if (flavour === 'affine:database'  && block.get('prop:title').toString()===params.dbname) {      
        // console.log('found 1 database.');
        
        
        // const views = block.get('prop:views') as Y.Array;
        // const firstView = views.get(0) as YMap;

        // const columns = firstView.get('columns'); 
        // console.log('Columns:', columns.toArray());
        const children = block.get('sys:children') as Y.Array;

        const columns = block.get('prop:columns') as Y.Array;
        const cells = block.get('prop:cells') as Y.Map;
        const ids = columns.toArray().map((column) => [column.get('type'), column.get('name'), column.get('id')]);

        //console.log(ids);
        this.example.map((row)=> {
            const newUuid=this.generateGuid();
            //const newUuid=nanoid();
            const yrow=new Y.Map();
            
            
            ids.forEach(([_type, _name, _id]) => {
              if(_type==='title') return;

              //const newId = new Y.Text();
              const newValue = new Y.Text();
              
              //newId.insert(0,_id);
              newValue.insert(0,row[_name]);

              const subrowmap=new Y.Map();
              subrowmap.set('columnId', _id);
              subrowmap.set('value', newValue);
              yrow.set(_id,subrowmap);
            });

            cells.set(newUuid, yrow);

            console.log('newuuid:'+newUuid);

            // const yUuid=new Y.Text();
            // yUuid.insert(0,newUuid);
            // children.push([yUuid]);
            children.push([newUuid]);

            const extraMap=new Y.Map();
            extraMap.set('sys:id',newUuid);
            extraMap.set('sys:flavour','affine:paragraph');
            extraMap.set('sys:version',1);
            extraMap.set('sys:children',new Y.Array());

            extraMap.set('prop:type','text');

            const yTime=new Y.Text();
            yTime.insert(0,row['Time']);
            extraMap.set('prop:text',yTime);
            //extraMap.set('prop:text',row['Time']);

            
            blocks.set(newUuid,extraMap);

        });
        
        const serializedState = Y.encodeStateAsUpdate(doc);
        docRecord.bin=serializedState;
        docRecord.timestamp=Date.now();
        
        await this.workspace.setDocSnapshot(docRecord);
        
        this.event.emit('snapshot.updated', {
          workspaceId: params.workspaceId,
          id: params.guid,
        });
        

      }

    }


    return 'Add OK';
  }

  // const workspaceId='909240e4-4294-4c84-8849-a93b9fa62b54';
  // const guid='u-9kOTAq0ebJYMksHFXxJ';


  
  // const snapshotIds = await this.db.snapshot.findMany({
  //   where: {
  //     workspaceId: destWorkspace, // 查询条件
  //   },
  //   select: {
  //     id: true, // 只选择 id 列
  //   },
  //   orderBy: {
  //     updatedAt: 'desc', // 按 updatedAt 倒序排列
  //   },
  // });
  

  
  //取得workspace的名字
  // const data=this.doc.getWorkspaceContent("909240e4-4294-4c84-8849-a93b9fa62b54");

  //取得指定页面的title和summary
  // const data=this.doc.getPageContent("909240e4-4294-4c84-8849-a93b9fa62b54","41lSFl35bKVsd0yHRhDLo");

  //取得指定页面的最新snapshot
  

  // const data=this.workspace.getDocSnapshot(workspaceId,"41lSFl35bKVsd0yHRhDLo");

 

  // const obj=await this.updateDatabase(workspaceId, guid, 'update-张三', example);

  // await this.emptyDatabase(workspaceId, guid, 'update-张三');
  // return obj;
  

  

  // const doc = await this.recoverDoc(data.bin);
  //  console.log(doc);

  // const data=this.workspace.getDoc("909240e4-4294-4c84-8849-a93b9fa62b54","41lSFl35bKVsd0yHRhDLo");
  

  //取得指定页面的所有snapshot history
  // const data=this.workspace.listDocHistories("909240e4-4294-4c84-8849-a93b9fa62b54","41lSFl35bKVsd0yHRhDLo", 
  //   { before: timestamp.getTime(), limit: 100 });


 
 


private pushChildren(block: Map<any>) {
  const children = block.get('sys:children') as Array<string> | undefined;
  if (children?.length) {
    for (let i = children.length - 1; i >= 0; i--) {
      queue.push(children.get(i));
    }
  }
}


private async updateTitle(workspaceId:string, guid:string, title:string){

  const docRecord = await this.workspace.getDoc(workspaceId, guid);
  if (!docRecord) {
    return null;
  }

  const doc = new Doc();
  applyUpdate(doc, docRecord.bin);
  const blocks = doc.getMap<Map<any>>('blocks');

  //let root: Map<any> | null = null;

  for (const block of blocks.values()) {
    const flavour = block.get('sys:flavour') as KnownFlavour;
    // console.log(flavour);
    // console.log('Is block a Y.Map:', block instanceof Y.Map);
    
    if (flavour === 'affine:page') {
      //const title = block.get('prop:title') as string;
      //console.log('title:'+title);

      const ytext = new Y.Text();
      ytext.insert(0, title);

      block.set('prop:title',ytext);
      break;
      //console.log('title:'+block.get('prop:title'));
    }
    // if (flavour === 'affine:paragraph') {
    //   //pushChildren(block);
    //   const text = block.get('prop:text');
    //   //console.log(text.toString());
    // }
  }

  const serializedState = Y.encodeStateAsUpdate(doc);
  docRecord.bin=serializedState;
  docRecord.timestamp=Date.now();
  
  await this.workspace.setDocSnapshot(docRecord);
  
  this.event.emit('snapshot.updated', {
   workspaceId: workspaceId,
   id: guid,
 });

}

//取得workspace的基本信息
  // const docRecord = await this.workspace.getDoc(workspaceId, workspaceId); 
  // if (!docRecord) {
  //   return null;
  // }
  // const tdoc = new Doc();
  // applyUpdate(tdoc, docRecord.bin);
  // const content = parsePageDoc(tdoc);
  // console.log(content);


//取得Main工作区所在的workspaceId
private async getMainWorkspace():String {

  const workspaceIds = await this.db.workspace.findMany();
  const ids = workspaceIds.map(workspace => workspace.id);

  // 批量获取所有数据
  const results = await Promise.all(ids.map(async id => {
    const data = await this.doc.getWorkspaceContent(id);
    return { id, data };
  }));

  // 查找第一个 name 为 "Main" 的 ID
  const result = results.find(({ data }) => data.name === "Main");
  return result?.id;

}  

private generateGuid() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let guid = '';
  for (let i = 0; i < 21; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    guid += chars[randomIndex];
  }
  return guid;
}

private recoverDoc(updates: Uint8Array[]): Promise<Y.Doc> {
  const doc = new Y.Doc();
  const chunks = chunk(updates, 10);
  let i = 0;

  return new Promise(resolve => {
    Y.transact(doc, () => {
      const next = () => {
        const updates = chunks.at(i++);

        if (updates?.length) {
          updates.forEach(u => {
            try {
              Y.applyUpdate(doc, u);
            } catch (e) {
              this.logger.error('Failed to apply update', e);
            }
          });

          // avoid applying too many updates in single round which will take the whole cpu time like dead lock
          setImmediate(() => {
            next();
          });
        } else {
          resolve(doc);
        }
      };

      next();
    });
  });
}


}

 // Doc {
  //   _observers: Map(2) {
  //     'load' => Set(1) { [Function (anonymous)] },
  //     'sync' => Set(2) { [Function (anonymous)], [Function: eventHandler] }
  //   },
  //   gc: true,
  //   gcFilter: [Function: gcFilter],
  //   clientID: 3530321787629277,
  //   guid: '0f74bf75-62d1-4c50-87e5-cf06fb5846b2',
  //   collectionid: null,
  //   share: Map(0) {},
  //   store: StructStore {
  //     clients: Map(0) {},
  //     pendingStructs: null,
  //     pendingDs: null
  //   },
  //   _transaction: null,
  //   _transactionCleanups: [],
  //   subdocs: Set(0) {},
  //   _item: null,
  //   shouldLoad: true,
  //   autoLoad: false,
  //   meta: null,
  //   isLoaded: false,
  //   isSynced: false,
  //   whenLoaded: Promise {
  //     <pending>,
  //     [Symbol(async_id_symbol)]: 12692,
  //     [Symbol(trigger_async_id_symbol)]: 12649,
  //     [Symbol(kResourceStore)]: undefined
  //   },
  //   whenSynced: Promise {
  //     <pending>,
  //     [Symbol(async_id_symbol)]: 12693,
  //     [Symbol(trigger_async_id_symbol)]: 12649,
  //     [Symbol(kResourceStore)]: undefined
  //   }
  // }