export interface IAddressData {
  city: string;
  range: number; // km from Kyiv/Hub (one-way)
  time: number; // hours from Kyiv/Hub (one-way)
}

// Address data: distances and travel times from Kyiv (Hub) to destinations
export const addressesData: Record<string, IAddressData> = {
  '68ee1a4f493031c91ab8ddb4': {
    city: 'Житомир',
    range: 140, // км from Kyiv
    time: 2, // hours from Kyiv
  },
  '68ee1a43493031c91ab8ddb2': {
    city: 'Суми',
    range: 350, // км from Kyiv
    time: 5, // hours from Kyiv
  },
  '68ee1a3c493031c91ab8ddb0': {
    city: 'Кропивницький',
    range: 310, // км from Kyiv
    time: 4.5, // hours from Kyiv
  },
  '68ee1a39493031c91ab8ddae': {
    city: 'Вінниця',
    range: 270, // км from Kyiv
    time: 5, // hours from Kyiv
  },
  '68ee1a1f493031c91ab8dda9': {
    city: 'Полтава',
    range: 340, // км from Kyiv
    time: 4.5, // hours from Kyiv
  },
  '68c593a37bfb49e53b71c924': {
    city: 'Чернівці',
    range: 470, // км from Kyiv
    time: 12, // hours from Kyiv
  },
  '68c588f18b086a91a8eb0eed': {
    city: 'Запоріжжя',
    range: 520, // км from Kyiv
    time: 11, // hours from Kyiv
  },
  '68c5889b8b086a91a8eb0ee6': {
    city: 'Дніпро',
    range: 480, // км from Kyiv
    time: 10, // hours from Kyiv
  },
  '68c5881e8b086a91a8eb0ee2': {
    city: 'Харків',
    range: 480, // км from Kyiv
    time: 6, // hours from Kyiv
  },
  '68c586e58b086a91a8eb0ed4': {
    city: 'Одеса',
    range: 480, // км from Kyiv
    time: 7, // hours from Kyiv
  },
  '689863f2dd3ee17c497f10e3': {
    city: 'Lviv',
    range: 540, // км from Kyiv
    time: 8, // hours from Kyiv
  },
};