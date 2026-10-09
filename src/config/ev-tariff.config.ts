export interface IEVTariff {
  lt: number;
  ht?: number;
}

export const EV_TARIFFS: Record<string, IEVTariff> = {
  "ANDAMAN & NICOBAR": {
    lt: 10,
  },

  "ANDHRA PRADESH": {
    lt: 6.7,
  },

  ASSAM: {
    lt: 5.9,
    ht: 7.4,
  },

  BIHAR: {
    lt: 8.87,
    ht: 8.0,
  },

  CHANDIGARH: {
    lt: 3.8,
    ht: 3.6,
  },

  CHHATTISGARH: {
    lt: 5.0,
  },

  DELHI: {
    lt: 4.5,
    ht: 4.0,
  },

  GOA: {
    lt: 4.7,
    ht: 4.5,
  },

  GUJARAT: {
    lt: 4.1,
    ht: 4.0,
  },

  HARYANA: {
    lt: 6.62,
    ht: 6.22,
  },

  "HIMACHAL PRADESH": {
    lt: 5.82,
  },

  "JAMMU & KASHMIR": {
    lt: 5.1,
    ht: 4.9,
  },

  JHARKHAND: {
    lt: 5.8,
  },

  KARNATAKA: {
    lt: 5.0,
  },

  KERALAM: {
    lt: 5.5,
    ht: 6.0,
  },

  LADAKH: {
    lt: 5.1,
    ht: 4.9,
  },

  LAKSHADWEEP: {
    lt: 7.8,
  },

  "MADHYA PRADESH": {
    lt: 6.79,
    ht: 6.96,
  },

  MAHARASHTRA: {
    lt: 6.08,
    ht: 6.9,
  },

  MEGHALAYA: {
    lt: 9.7,
    ht: 9.9,
  },

  MIZORAM: {
    lt: 8.2,
    ht: 8.65,
  },

  ODISHA: {
    lt: 5.5,
  },

  PUDUCHERRY: {
    lt: 5.53,
    ht: 5.33,
  },

  PUNJAB: {
    lt: 6.28,
  },

  RAJASTHAN: {
    lt: 6.0,
  },

  SIKKIM: {
    lt: 5.5,
  },

  "TAMIL NADU": {
    lt: 6.0,
    ht: 6.0,
  },

  TELANGANA: {
    lt: 6.0,
    ht: 5.0,
  },

  TRIPURA: {
    lt: 6.9,
  },

  "UT OF D&NH AND D&D": {
    lt: 5.1,
    ht: 4.9,
  },

  "UTTAR PRADESH": {
    lt: 7.7,
    ht: 7.3,
  },

  UTTARAKHAND: {
    lt: 6.25,
  },

  "WEST BENGAL": {
    lt: 6.0,
  },
};
