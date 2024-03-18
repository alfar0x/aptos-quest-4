import "dotenv/config";
import { AptosAccount, HexString } from "aptos";
import Big from "big.js";
import { createFiles, readByLine, wait } from "./common.js";
import {
  UPDATE_TOKEN_PRICES_MS,
  MIN_ACC_SLEEP_SEC,
  MAX_ACC_SLEEP_SEC,
} from "./config.js";
import worker from "./worker.js";
import logger from "./logger.js";
import { updateTokenPrices } from "./helpers.js";

let lastPricesUpdateTime = 0;

const FILE_PRIVATE_KEYS = "input/privateKeys.txt";

const main = async () => {
  createFiles([FILE_PRIVATE_KEYS]);
  const privateKeys = readByLine(FILE_PRIVATE_KEYS).map((p) => p.trim());

  logger.info(`found ${privateKeys.length} private keys`);

  await wait(10);

  let idx = 1;

  for (const privateKey of privateKeys) {
    if (Big(lastPricesUpdateTime).plus(UPDATE_TOKEN_PRICES_MS).lt(Date.now())) {
      await updateTokenPrices();
      lastPricesUpdateTime = Date.now();
    }

    const account = new AptosAccount(new HexString(privateKey).toUint8Array());
    logger.info(`starting ${idx} account ${account.address().toString()}`);

    try {
      await worker(account);
    } catch (error) {
      logger.error(error.message);
    }

    if (idx < privateKeys.length) {
      await wait(MIN_ACC_SLEEP_SEC, MAX_ACC_SLEEP_SEC);
      idx += 1;
    }
  }

  logger.info(`done ${privateKeys.length} accounts`);
};

main();
