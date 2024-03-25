import "dotenv/config";
import { AptosAccount, HexString } from "aptos";
import { appendFile, createFiles, readByLine, wait } from "./helpers.js";
import {
  MIN_ACC_SLEEP_SEC,
  MAX_ACC_SLEEP_SEC,
  EXPLORER_URL,
  MIN_TX_SLEEP_SEC,
  MAX_TX_SLEEP_SEC,
} from "./config.js";
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
      const swapAptToUsdtHash = await swapAptToUsdt(account);
      logger.info(`swap apt to usdt: ${EXPLORER_URL}/${swapAptToUsdtHash}`);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);

      const ariesLendUsdtHash = await ariesLendUsdt(account);
      logger.info(`supply usdt: ${EXPLORER_URL}/${ariesLendUsdtHash}`);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);

      const swapAptToCellHash = await swapAptToCell(account);
      logger.info(`swap apt to cell: ${EXPLORER_URL}/${swapAptToCellHash}`);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);

      const createLockHash = await createLock(account);
      logger.info(`create lock: ${EXPLORER_URL}/${createLockHash}`);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);

      const voteHash = await vote(account);
      if (voteHash) logger.info(`vote: ${EXPLORER_URL}/${voteHash}`);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
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
