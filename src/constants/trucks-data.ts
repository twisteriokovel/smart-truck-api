export interface ITruckData {
  model: string;
  consumption: number; // L/100km
  averageSpeed: number; // km/h
}

// Truck specifications data
export const trucksData: Record<string, ITruckData> = {
  '68ee1959493031c91ab8dda1': {
    model: 'Iveco Eurocargo 75E',
    consumption: 18, // л/100км
    averageSpeed: 75, // км/год
  },
  '68ee1941493031c91ab8dd9b': {
    model: 'Hyundai HD65',
    consumption: 15, // л/100км
    averageSpeed: 70, // км/год
  },
  '68ee1926493031c91ab8dd98': {
    model: 'Isuzu NPR',
    consumption: 16, // л/100км
    averageSpeed: 75, // км/год
  },
  '68ee18da493031c91ab8dd86': {
    model: 'MAN',
    consumption: 28, // л/100км
    averageSpeed: 80, // км/год
  },
  '68ee18a6493031c91ab8dd80': {
    model: 'МАЗ-5440',
    consumption: 30, // л/100км
    averageSpeed: 80, // км/год
  },
  '68ee1874493031c91ab8dd76': {
    model: 'МАЗ-6312',
    consumption: 32, // л/100км
    averageSpeed: 75, // км/год
  },
  '68ee16ea493031c91ab8dd66': {
    model: 'Volvo FH16',
    consumption: 30, // л/100км
    averageSpeed: 85, // км/год
  },
  '68e79bce50a4d988df7d65e8': {
    model: 'Volvo FL',
    consumption: 20, // л/100км
    averageSpeed: 80, // км/год
  },
  '68e79b6d50a4d988df7d65e3': {
    model: 'Isuzu N-Series',
    consumption: 14, // л/100км
    averageSpeed: 70, // км/год
  },
  '68e79b2450a4d988df7d65de': {
    model: 'Mercedes Sprinter',
    consumption: 11, // л/100км
    averageSpeed: 90, // км/год
  },
  '68e79ad750a4d988df7d65d9': {
    model: 'Ford Transit',
    consumption: 10, // л/100км
    averageSpeed: 90, // км/год
  },
  '68c82cff143c5df8853c64ed': {
    model: 'Volvo FH 460',
    consumption: 28, // л/100км
    averageSpeed: 85, // км/год
  },
  '68c82c85c5ee10bdfa265f07': {
    model: 'Mercedes-Benz Actros 1845',
    consumption: 28, // л/100км
    averageSpeed: 85, // км/год
  },
};