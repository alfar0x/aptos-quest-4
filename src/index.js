import "dotenv/config";
import { AptosAccount, HexString } from "aptos";
import { createFiles, readByLine, wait } from "./helpers.js";
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

const main = async () => {
  createFiles([FILE_PRIVATE_KEYS]);
  const privateKeys = readByLine(FILE_PRIVATE_KEYS).map((p) => p.trim());

  logger.info(`found ${privateKeys.length} private keys`);

  await wait(10);

  let idx = 1;

  for (const privateKey of privateKeys) {
    const account = new AptosAccount(new HexString(privateKey).toUint8Array());
    logger.info(`starting ${idx} account ${account.address().toString()}`);

    try {
      const swapAptToUsdtHash = await swapAptToUsdt(account);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
      logger.info(`swap apt to usdt: ${EXPLORER_URL}/${swapAptToUsdtHash}`);

      const ariesLendUsdtHash = await ariesLendUsdt(account);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
      logger.info(`supply usdt: ${EXPLORER_URL}/${ariesLendUsdtHash}`);

      const swapAptToCellHash = await swapAptToCell(account);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
      logger.info(`swap apt to cell: ${EXPLORER_URL}/${swapAptToCellHash}`);

      const createLockHash = await createLock(account);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
      logger.info(`create lock: ${EXPLORER_URL}/${createLockHash}`);

      const voteHash = await vote(account);
      await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
      logger.info(`vote: ${EXPLORER_URL}/${voteHash}`);
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
