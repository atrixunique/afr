import {
  Manager as SocketIOManager,
  type Socket as SocketIO,
  type SocketOptions,
} from 'socket.io-client';

import { AutoReconnectConnection } from '../../connection';
import { throwIfAborted } from '../../utils/throw-if-aborted';

// TODO(@forehalo): use [UserFriendlyError]
interface EventError {
  name: string;
  message: string;
}

type WebsocketResponse<T> =
  | {
      error: EventError;
    }
  | {
      data: T;
    };

interface ServerEvents {
  'space:broadcast-doc-update': {
    spaceType: string;
    spaceId: string;
    docId: string;
    update: string;
    timestamp: number;
    editor: string;
  };

  'space:collect-awareness': {
    spaceType: string;
    spaceId: string;
    docId: string;
  };

  'space:broadcast-awareness-update': {
    spaceType: string;
    spaceId: string;
    docId: string;
    awarenessUpdate: string;
  };
}

interface ClientEvents {
  'space:join': [
    { spaceType: string; spaceId: string; clientVersion: string },
    { clientId: string },
  ];
  'space:leave': { spaceType: string; spaceId: string };
  'space:join-awareness': [
    {
      spaceType: string;
      spaceId: string;
      docId: string;
      clientVersion: string;
    },
    { clientId: string },
  ];
  'space:leave-awareness': {
    spaceType: string;
    spaceId: string;
    docId: string;
  };

  'space:update-awareness': {
    spaceType: string;
    spaceId: string;
    docId: string;
    awarenessUpdate: string;
  };

  'space:load-awarenesses': {
    spaceType: string;
    spaceId: string;
    docId: string;
  };

  'space:push-doc-update': [
    { spaceType: string; spaceId: string; docId: string; update: string },
    { timestamp: number },
  ];
  'space:load-doc-timestamps': [
    {
      spaceType: string;
      spaceId: string;
      timestamp?: number;
    },
    Record<string, number>,
  ];
  'space:load-doc': [
    {
      spaceType: string;
      spaceId: string;
      docId: string;
      stateVector?: string;
    },
    {
      missing: string;
      state: string;
      timestamp: number;
    },
  ];
  'space:delete-doc': { spaceType: string; spaceId: string; docId: string };
}

export type ServerEventsMap = {
  [Key in keyof ServerEvents]: (data: ServerEvents[Key]) => void;
};

export type ClientEventsMap = {
  [Key in keyof ClientEvents]: ClientEvents[Key] extends Array<any>
    ? (
        data: ClientEvents[Key][0],
        ack: (res: WebsocketResponse<ClientEvents[Key][1]>) => void
      ) => void
    : (data: ClientEvents[Key]) => void;
};

export type Socket = SocketIO<ServerEventsMap, ClientEventsMap>;

export function uint8ArrayToBase64(array: Uint8Array): Promise<string> {
  return new Promise<string>(resolve => {
    // Create a blob from the Uint8Array
    const blob = new Blob([array]);

    const reader = new FileReader();
    reader.onload = function () {
      const dataUrl = reader.result as string | null;
      if (!dataUrl) {
        resolve('');
        return;
      }
      // The result includes the `data:` URL prefix and the MIME type. We only want the Base64 data
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };

    reader.readAsDataURL(blob);
  });
}

export function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const binaryArray = [...binaryString].map(function (char) {
    return char.charCodeAt(0);
  });
  return new Uint8Array(binaryArray);
}

const SOCKET_IOMANAGER_CACHE = new Map<string, SocketIOManager>();
function getSocketIOManager(endpoint: string) {
  let manager = SOCKET_IOMANAGER_CACHE.get(endpoint);
  if (!manager) {
    manager = new SocketIOManager(endpoint, {
      autoConnect: false,
      transports: ['websocket'],
      secure: new URL(endpoint).protocol === 'https:',
      // we will handle reconnection by ourselves
      reconnection: false,
    });
    SOCKET_IOMANAGER_CACHE.set(endpoint, manager);
  }
  return manager;
}

export class SocketConnection extends AutoReconnectConnection<Socket> {
  manager = getSocketIOManager(this.endpoint);

  constructor(
    private readonly endpoint: string,
    private readonly socketOptions?: SocketOptions
  ) {
    super();
  }

  override get shareId() {
    return `socket:${this.endpoint}`;
  }

  override async doConnect(signal?: AbortSignal) {
    const socket = this.manager.socket('/', this.socketOptions);
    try {
      throwIfAborted(signal);
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          socket.once('connect', () => {
            resolve();
          });
          socket.once('connect_error', err => {
            reject(err);
          });
          socket.open();
        }),
        new Promise<void>((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new Error('Aborted'));
          });
        }),
      ]);
    } catch (err) {
      socket.close();
      throw err;
    }

    socket.on('disconnect', this.handleDisconnect);

    return socket;
  }

  override doDisconnect(conn: Socket) {
    conn.off('disconnect', this.handleDisconnect);
    conn.close();
  }

  handleDisconnect = (reason: SocketIO.DisconnectReason) => {
    this.error = new Error(reason);
  };
}
