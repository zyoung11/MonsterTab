import { storage } from './storage';
import { db, FaviconItem, WallpaperItem } from './db';
import { FAVICON_PREFIX, getDomainFromRef } from '@/features/dock/utils/iconCache';
import { DockItem, Sticker } from '@/shared/types';
import packageInfo from '../../../package.json';

type BackupManifest = {
  type: 'monster-tab-backup';
  version: 2;
  appVersion: string;
  exportedAt: string;
};

type AssetBlob = {
  mime: string;
  base64: string;
};

type FaviconAsset = AssetBlob & {
  domain: string;
  isFallback: boolean;
  iconSmall?: boolean;
  lastUpdated?: number;
};

type StickerImageAsset = AssetBlob & {
  id: string;
};

type WallpaperAsset = AssetBlob & {
  id: string;
  createdAt: number;
  wallpaperType?: 'image' | 'video';
  thumbnail?: AssetBlob;
};

type BackupData = {
  spaces: ReturnType<typeof storage.getSpaces>;
  config: ReturnType<typeof storage.getConfig>;
  searchEngine: ReturnType<typeof storage.getSearchEngine>;
  wallpaperId: string | null;
  language: string | null;
  stickers: Sticker[];
  deletedStickers: Sticker[];
  stickerImagesMigrated: boolean;
  assets: {
    favicons: FaviconAsset[];
    stickerImages: StickerImageAsset[];
    wallpaper: WallpaperAsset | null;
  };
};

type BackupFile = BackupManifest & {
  data: BackupData;
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const base64ToBlob = (base64: string, mime: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

const collectFaviconDomains = (items: DockItem[], domains = new Set<string>()): Set<string> => {
  for (const item of items) {
    if (item.icon?.startsWith(FAVICON_PREFIX)) {
      domains.add(getDomainFromRef(item.icon));
    }
    if (item.type === 'folder' && item.items) {
      collectFaviconDomains(item.items, domains);
    }
  }
  return domains;
};

const collectStickerImageIds = (stickers: Sticker[], ids = new Set<string>()): Set<string> => {
  for (const sticker of stickers) {
    if (sticker.type === 'image' && sticker.content && !sticker.content.startsWith('data:')) {
      ids.add(sticker.content);
    }
  }
  return ids;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportFullBackup(): Promise<void> {
  const spaces = storage.getSpaces();
  const config = storage.getConfig();
  const searchEngine = storage.getSearchEngine();
  const wallpaperId = storage.getWallpaperId();
  const stickers = storage.getStickers();
  const deletedStickers = storage.getDeletedStickers();

  const faviconAssets: FaviconAsset[] = [];
  const stickerImageAssets: StickerImageAsset[] = [];
  let wallpaperAsset: WallpaperAsset | null = null;

  const faviconDomains = new Set<string>();
  for (const space of spaces.spaces) {
    collectFaviconDomains(space.apps, faviconDomains);
  }

  for (const domain of faviconDomains) {
    const item = await db.getFavicon(domain);
    if (!item?.data) continue;

    faviconAssets.push({
      domain,
      mime: item.data.type || 'image/png',
      base64: await blobToBase64(item.data),
      isFallback: item.isFallback,
      iconSmall: item.iconSmall,
      lastUpdated: item.lastUpdated,
    });
  }

  const stickerImageIds = collectStickerImageIds(stickers);
  collectStickerImageIds(deletedStickers, stickerImageIds);

  for (const id of stickerImageIds) {
    const item = await db.getStickerImage(id);
    if (!item?.data) continue;

    stickerImageAssets.push({
      id,
      mime: item.data.type || 'image/png',
      base64: await blobToBase64(item.data),
    });
  }

  if (wallpaperId) {
    const item = await db.get(wallpaperId);
    if (item?.data) {
      let thumbnail: AssetBlob | undefined;
      if (item.thumbnail) {
        thumbnail = {
          mime: item.thumbnail.type || 'image/png',
          base64: await blobToBase64(item.thumbnail),
        };
      }

      wallpaperAsset = {
        id: item.id,
        mime: item.data.type || 'application/octet-stream',
        base64: await blobToBase64(item.data),
        createdAt: item.createdAt,
        wallpaperType: item.type,
        thumbnail,
      };
    }
  }

  const backup: BackupFile = {
    type: 'monster-tab-backup',
    version: 2,
    appVersion: packageInfo.version,
    exportedAt: new Date().toISOString(),
    data: {
      spaces,
      config,
      searchEngine,
      wallpaperId,
      language: localStorage.getItem('app_language'),
      stickers,
      deletedStickers,
      stickerImagesMigrated: storage.isStickerImagesMigrated(),
      assets: {
        favicons: faviconAssets,
        stickerImages: stickerImageAssets,
        wallpaper: wallpaperAsset,
      },
    },
  };

  const json = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(json, `monster-tab-backup-${date}.json`);
}

export async function importFullBackup(file: File): Promise<void> {
  let backup: BackupFile;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    throw new Error('Unsupported backup file');
  }

  if (backup.type !== 'monster-tab-backup' || backup.version !== 2) {
    throw new Error('Unsupported backup file');
  }

  const data = backup.data;
  if (!data.spaces?.spaces || !Array.isArray(data.spaces.spaces)) {
    throw new Error('Invalid backup data');
  }

  await db.clearAllFavicons();
  await db.clearAllStickerImages();

  const oldWallpapers = await db.getAll();
  if (oldWallpapers.length > 0) {
    await db.removeMultiple(oldWallpapers.map(item => item.id));
  }

  for (const asset of data.assets?.favicons || []) {
    const item: FaviconItem = {
      domain: asset.domain,
      data: base64ToBlob(asset.base64, asset.mime || 'image/png'),
      isFallback: asset.isFallback,
      iconSmall: asset.iconSmall,
      lastUpdated: asset.lastUpdated,
    };
    await db.saveFavicon(item);
  }

  for (const asset of data.assets?.stickerImages || []) {
    await db.saveStickerImage({
      id: asset.id,
      data: base64ToBlob(asset.base64, asset.mime || 'image/png'),
    });
  }

  if (data.assets?.wallpaper) {
    const asset = data.assets.wallpaper;
    const thumbnail = asset.thumbnail
      ? base64ToBlob(asset.thumbnail.base64, asset.thumbnail.mime || 'image/png')
      : undefined;

    const item: WallpaperItem = {
      id: asset.id,
      data: base64ToBlob(asset.base64, asset.mime || 'application/octet-stream'),
      thumbnail,
      createdAt: asset.createdAt || Date.now(),
      type: asset.wallpaperType,
    };
    await db.save(item);
  }

  storage.saveSpaces(data.spaces);
  storage.saveConfig(data.config);
  storage.saveWallpaperId(data.wallpaperId || null);
  storage.saveStickers(data.stickers || []);
  storage.saveDeletedStickers(data.deletedStickers || []);

  if (data.searchEngine) {
    storage.saveSearchEngine(data.searchEngine);
  } else {
    localStorage.removeItem('MonsterTab_searchEngine');
  }

  if (data.language === 'en' || data.language === 'zh') {
    localStorage.setItem('app_language', data.language);
  }

  if (data.stickerImagesMigrated) {
    storage.markStickerImagesMigrated();
  }
}
