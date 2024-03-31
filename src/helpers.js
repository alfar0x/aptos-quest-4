import path from "path";
import fs from "fs";
import logger from "./logger.js";
import {
  addSeconds,
  differenceInMinutes,
  formatDistanceToNowStrict,
  formatRelative,
} from "date-fns";
import {
  EXPLORER_URL,
  MAX_TX_SLEEP_SEC,
  MIN_TX_SLEEP_SEC,
  TIMES_TO_RETRY_TX,
} from "./config.js";

export const replaceAll = (
  /** @type {string} */ str,
  /** @type {any[]} */ replacers,
) => {
  return replacers.reduce(
    (s, { search, replace }) => s.replaceAll(search, replace),
    str,
  );
};

export const formatRel = (/** @type {number} */ sec) => {
  const time = addSeconds(new Date(), sec);

  const relative = formatRelative(time, new Date());

  const relFormatted =
    differenceInMinutes(time, new Date()) > 24 * 60
      ? relative
      : replaceAll(relative, [
          { search: "today at ", replace: "" },
          { search: "tomorrow at ", replace: "" },
        ]);

  const distance = replaceAll(formatDistanceToNowStrict(time), [
    { search: " seconds", replace: "s" },
    { search: " minutes", replace: "m" },
    { search: " hours", replace: "h" },
    { search: " days", replace: "d" },
    { search: " months", replace: "mth" },
    { search: " years", replace: "y" },
    { search: " second", replace: "s" },
    { search: " minute", replace: "m" },
    { search: " hour", replace: "h" },
    { search: " day", replace: "d" },
    { search: " month", replace: "mth" },
    { search: " year", replace: "y" },
  ]);

  return `${relFormatted} (${distance})`;
};

export const readByLine = (name) =>
  fs
    .readFileSync(name, { encoding: "utf-8" })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((i) => i.trim());

export const appendFile = (name, data) =>
  fs.appendFileSync(name, data, { encoding: "utf-8" });

export const randomChoice = (/** @type {any[]} */ array) =>
  array[Math.floor(Math.random() * array.length)];

export const shuffle = (/** @type {any[]} */ array) =>
  [...array].sort(() => Math.random() - 0.5);

export const randomChoices = (
  /** @type {any[]} */ array,
  /** @type {number} */ count,
) => {
  return shuffle(array).slice(0, count);
};

export const randomInt = (
  /** @type {number} */ min,
  /** @type {number} */ max,
) => {
  const roundedMin = Math.ceil(min);
  const roundedMax = Math.floor(max);

  return Math.floor(Math.random() * (roundedMax - roundedMin + 1)) + roundedMin;
};

export const createFiles = (/** @type {string[]} */ paths) => {
  paths.forEach((filePath) => {
    const absolutePath = path.resolve(filePath);

    if (fs.existsSync(absolutePath)) return;

    const isDirectory = path.extname(filePath) === "";

    if (isDirectory) {
      fs.mkdirSync(absolutePath, { recursive: true });
      logger.info(`directory created: ${absolutePath}`);
      return;
    }

    const dirname = path.dirname(absolutePath);

    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
      logger.info(`directory created: ${dirname}`);
    }

    fs.writeFileSync(absolutePath, "", "utf-8");
    logger.info(`file created: ${absolutePath}`);
  });
};

export const wait = async (
  /** @type {number} */ minSec,
  /** @type {number | undefined} */ maxSec,
) => {
  const sec = maxSec ? randomInt(minSec, maxSec) : minSec;
  if (sec > 60) {
    logger.info(`sleeping until ${formatRel(sec)}`);
  }
  await new Promise((resolve) => setTimeout(resolve, Math.round(sec * 1000)));
};

export const generateRandomIntegersWithSum = (
  /** @type {number} */ count,
  /** @type {number} */ sum,
) => {
  if (count <= 0) throw new Error("count must be positive");
  if (sum < 0) throw new Error("sum must be positive");

  const result = [];
  let innerSum = sum;

  for (let i = 0; i < count - 1; i++) {
    const rnd = Math.floor(Math.random() * (innerSum - 1)) + 1;
    result.push(rnd);
    innerSum -= rnd;
  }

  result.push(innerSum);

  return result;
};

export const wrapper = async (name, action, account, disableSleep) => {
  let retries = TIMES_TO_RETRY_TX;

  while (retries >= 1) {
    try {
      const hash = await action(account);
      if (hash) {
        if (hash?.startsWith("0x")) {
          logger.info(`${name}: ${EXPLORER_URL}/${hash}`);
        } else {
          logger.info(`${name}: ${hash}`);
        }
      }
      if (!disableSleep) await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
      return;
    } catch (error) {
      logger.error(error.message);
      await wait(10, 40);
    }

    retries -= 1;
  }

  throw new Error("retry attempts has been reached");
};

export const getTokenBalancesFromResources = (resources, address) => {
  const resource = resources.find(
    (r) => r?.type === "0x1::coin::CoinStore<" + address + ">",
  );

  return resource?.data?.coin?.value || 0;
};
