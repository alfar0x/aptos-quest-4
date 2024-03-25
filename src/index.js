import "dotenv/config";
import { AptosAccount, HexString } from "aptos";
import {
  appendFile,
  createFiles,
  readByLine,
  wait,
  wrapper,
} from "./helpers.js";
import { MIN_ACC_SLEEP_SEC, MAX_ACC_SLEEP_SEC } from "./config.js";
import {
  swapAptToUsdt,
  ariesLendUsdt,
  swapAptToCell,
  createLock,
  vote,
} from "./actions.js";
import logger from "./logger.js";

const FILE_PRIVATE_KEYS = "input/privateKeys.txt";
const FILE_FAILED_KEYS = "input/failed.txt";

const main = async () => {
  createFiles([FILE_PRIVATE_KEYS, FILE_FAILED_KEYS]);
  const privateKeys = readByLine(FILE_PRIVATE_KEYS).map((p) => p.trim());

  logger.info(`found ${privateKeys.length} private keys`);

  await wait(10);

  let idx = 1;

  for (const privateKey of privateKeys) {
    const account = new AptosAccount(new HexString(privateKey).toUint8Array());
    logger.info(`starting ${idx} account ${account.address().toString()}`);

    try {
      await wrapper("swap apt to usdt", swapAptToUsdt, account);
      await wrapper("supply usdt", ariesLendUsdt, account);
      await wrapper("swap apt to cell", swapAptToCell, account);
      await wrapper("lock cell", createLock, account);
      await wrapper("vote", vote, account, true);
    } catch (error) {
      logger.error(error.message);
      appendFile(FILE_FAILED_KEYS, `${privateKey}\n`);
    }

    if (idx < privateKeys.length) {
      await wait(MIN_ACC_SLEEP_SEC, MAX_ACC_SLEEP_SEC);
      idx += 1;
    }
  }

  logger.info(`done ${privateKeys.length} accounts`);
};

main();
