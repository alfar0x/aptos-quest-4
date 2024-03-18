// eslint-disable-next-line no-unused-vars
import { AptosAccount } from "aptos";
import Big from "big.js";
import { randomInt, sleep, initDefaultLogger, formatRel } from "@alfar/helpers";
import tokens from "./tokens.js";
import client from "./client.js";

export const logger = initDefaultLogger();

export const updateTokenPrices = async () => {
  logger.info(`updating token prices`);

  const ids = Object.values(tokens).map((value) => value.geskoId);

  const params = { ids, vs_currencies: "usd" };

  // @ts-ignore
  const urlParams = new URLSearchParams(params).toString();

  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?" + urlParams,
  );

  const data = await response.json();

  for (const tokenKey of Object.keys(tokens)) {
    if (data[tokens[tokenKey].geskoId].usd) {
      tokens[tokenKey].price = data[tokens[tokenKey].geskoId].usd;
    } else {
      tokens[tokenKey].price = tokens[tokenKey].defaultPrice;

      logger.warn(
        `token ${tokens[tokenKey].geskoId} default price set: ${tokens[tokenKey].defaultPrice}`,
      );
    }
  }
};

export const wait = async (
  /** @type {number} */ minSec,
  /** @type {number | undefined} */ maxSec,
) => {
  const sec = maxSec ? randomInt(minSec, maxSec) : minSec;
  if (sec > 60) {
    logger.info(`sleeping until ${formatRel(sec)}`);
  }
  await sleep(sec);
};

export const normalizedToReadable = (
  /** @type {Big.BigSource} */ normalized,
  /** @type {number} */ decimals,
) => {
  const divider = Big(10).pow(decimals);
  return Big(normalized).div(divider).round(decimals).toNumber();
};

export const readableToNormalized = (
  /** @type {Big.BigSource} */ readable,
  /** @type {number} */ decimals,
) => {
  const multiplier = Big(10).pow(decimals);
  return Big(readable).times(multiplier).round().toNumber();
};

export const readableToUsd = (
  /** @type {Big.BigSource} */ readable,
  /** @type {number} */ price,
) => {
  return Big(readable).times(price).round(2).toNumber();
};

export const getTokenBalance = async (
  /** @type {AptosAccount} */ account,
  /** @type {{address:string, decimals: number, price: number}} */ token,
) => {
  const { address, decimals } = token;

  const fullAddress = "0x1::coin::CoinStore<" + address + ">";
  const resources = await client.getAccountResources(account.address());
  for (let i = 0; i < resources.length; i++) {
    if (resources[i].type === fullAddress) {
      // @ts-ignore
      const normalized = resources[i].data.coin.value;
      const readable = normalizedToReadable(normalized, decimals);
      const usd = readableToUsd(readable, token.price);

      return { normalized, readable, usd };
    }
  }
  return { normalized: 0, readable: 0, usd: 0 };
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
