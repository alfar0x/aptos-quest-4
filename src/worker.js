// eslint-disable-next-line no-unused-vars
import { AptosAccount } from "aptos";
import {
  swapAptToUsdt,
  ariesLendUsdt,
  swapAptToCell,
  createLock,
  vote,
} from "./actions.js";
import { wait } from "./common.js";
import { EXPLORER_URL, MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC } from "./config.js";
import logger from "./logger.js";

const worker = async (/** @type {AptosAccount} */ account) => {
  // const swapAptToUsdtHash = await swapAptToUsdt(account);
  // await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
  // logger.info(`swap apt to usdt: ${EXPLORER_URL}/${swapAptToUsdtHash}`);

  // const ariesLendUsdtHash = await ariesLendUsdt(account);
  // await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
  // logger.info(`supply usdt: ${EXPLORER_URL}/${ariesLendUsdtHash}`);

  // const swapAptToCellHash = await swapAptToCell(account);
  // await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
  // logger.info(`swap apt to cell: ${EXPLORER_URL}/${swapAptToCellHash}`);

  // const createLockHash = await createLock(account);
  // await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
  // logger.info(`create lock: ${EXPLORER_URL}/${createLockHash}`);

  const voteHash = await vote(account);
  await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
  logger.info(`vote: ${EXPLORER_URL}/${voteHash}`);
};

export default worker;
