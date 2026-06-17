import { env } from '../config/env.js';

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export function getIceServers(): IceServerConfig[] {
  const servers: IceServerConfig[] = [];

  const stunUrls = env.STUN_URLS.split(',').map((u) => u.trim()).filter(Boolean);
  if (stunUrls.length > 0) {
    servers.push({ urls: stunUrls });
  } else {
    servers.push({ urls: 'stun:stun.l.google.com:19302' });
  }

  if (env.TURN_URL) {
    servers.push({
      urls: env.TURN_URL,
      username: env.TURN_USERNAME,
      credential: env.TURN_CREDENTIAL,
    });
  }

  return servers;
}
