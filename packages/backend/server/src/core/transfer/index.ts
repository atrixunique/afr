import { Module } from '@nestjs/common';

// import { FeatureModule } from '../features';
// import { QuotaModule } from '../quota';
import { UserModule } from '../user';
import { PermissionModule } from '../permission';
import { DocRendererModule} from '../doc-renderer';
import { DocStorageModule}  from '../doc';

import { TransferController } from './controller';
import { TransferService } from './service';



@Module({
  imports: [UserModule, PermissionModule, DocRendererModule,DocStorageModule],
  providers: [
    TransferService,
  ],
  exports: [TransferService],
  controllers: [TransferController],
})
export class TransferModule {}

export { TransferService };

