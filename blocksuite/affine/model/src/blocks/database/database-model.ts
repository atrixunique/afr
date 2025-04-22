import { Text } from '@blocksuite/store';
import { BlockModel, defineBlockSchema } from '@blocksuite/store';

import type { Column, SerializedCells, ViewBasicDataType } from './types.js';


export type DatabaseBlockProps = {
  views: ViewBasicDataType[];
  title: Text;
  cells: SerializedCells;
  columns: Array<Column>;
};

export class DatabaseBlockModel extends BlockModel<DatabaseBlockProps> {



  addRowWithValue(value:String){
    // const block = this.schema.model.createBlock();
    // block.text.deltas$.value = value;
    // this.yBlock.push(block); 

    this.doc.captureSync();
    const newBlock=this.doc.addBlock('affine:paragraph', {
      type:'text',
      text: new Text(value)
    }, this.id, 0);
    //console.log(this.doc);

   
  
    //console.log(newBlock);





    //const newBlock = new ParagraphBlockModel();


    // newBlock.schema = ParagraphBlockSchema;
    // newBlock.text.insert(0, value);  
    // newBlock.id=nanoid();
    // const newBlock = { ...this.children[0] };
    // newBlock.id=nanoid();
     
    

    // newBlock.text.delete(0, text.length); 
    // newBlock.text.insert(0, value);   

    // const yValue =  new Y.Text();
    // yValue.insert(0,value);
    // newBlock.text=yValue;
    //console.log(newBlock.text);

    //this.children.push(newBlock);

    
  }





}

export const DatabaseBlockSchema = defineBlockSchema({
  flavour: 'affine:database',
  props: (internal): DatabaseBlockProps => ({
    views: [],
    title: internal.Text(),
    cells: Object.create(null),
    columns: [],
  }),
  metadata: {
    role: 'hub',
    version: 3,
    parent: ['affine:note'],
    children: ['affine:paragraph', 'affine:list'],
  },
  toModel: () => new DatabaseBlockModel(),
});

declare global {
  namespace BlockSuite {
    interface BlockModels {
      'affine:database': DatabaseBlockModel;
    }
  }
}
