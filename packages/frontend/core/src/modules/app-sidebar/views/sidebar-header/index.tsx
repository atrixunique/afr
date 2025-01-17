import { useLiveData, useService } from '@toeverything/infra';

import { AppSidebarService } from '../../services/app-sidebar';
import { navHeaderStyle } from '../index.css';
import { SidebarSwitch } from './sidebar-switch';

export const SidebarHeader = () => {
  const appSidebarService = useService(AppSidebarService).sidebar;
  const open = useLiveData(appSidebarService.open$);

  return (
    <div className={navHeaderStyle} data-open={open}>
            <a href="#" style={{fontStyle: 'oblique 23deg', fontWeight:'bold', color:'black',fontSize:'18px'}}>Memo Notion V1.1</a>
      <SidebarSwitch show={open} />
    </div>
  );
};

export * from './sidebar-switch';
