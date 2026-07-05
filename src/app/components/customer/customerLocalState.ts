export type FavoriteKind = 'store' | 'product';

export interface FavoriteItem {
  id: string;
  kind: FavoriteKind;
  name: string;
  subtitle: string;
  emoji: string;
  price?: number;
}

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Demo storage is best effort.
  }
};

export const customerStorage = {
  getFavorites: () => read<FavoriteItem[]>('rayoexpress-favorites', []),
  setFavorites: (items: FavoriteItem[]) => write('rayoexpress-favorites', items),
  toggleFavorite: (item: FavoriteItem) => {
    const current = customerStorage.getFavorites();
    const exists = current.some((fav) => fav.id === item.id && fav.kind === item.kind);
    const next = exists
      ? current.filter((fav) => !(fav.id === item.id && fav.kind === item.kind))
      : [item, ...current];
    customerStorage.setFavorites(next);
    return next;
  },
  isFavorite: (id: string, kind: FavoriteKind) =>
    customerStorage.getFavorites().some((fav) => fav.id === id && fav.kind === kind),
  getAddresses: () =>
    read('rayoexpress-addresses', [
      {
        id: 'home',
        title: 'Direccion de entrega actual',
        line1: 'C. Manuelita Saenz, gestion riesgo',
        details: 'gestion de riesgos',
      },
    ]),
  setAddresses: (items: Array<{ id: string; title: string; line1: string; details: string }>) =>
    write('rayoexpress-addresses', items),
};
