import winston from "winston";

export const errorFilter = winston.format((info) => (info.level === "error" ? info : false));

export const warnFilter = winston.format((info) => (info.level === "warn" ? info : false));

export const infoFilter = winston.format((info) => (info.level === "info" ? info : false));

export const debugFilter = winston.format((info) => (info.level === "debug" ? info : false));
