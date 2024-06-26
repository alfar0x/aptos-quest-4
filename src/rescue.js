import "dotenv/config";
import { AptosAccount, HexString } from "aptos";
import {
  appendFile,
  createFiles,
  getTokenBalancesFromResources,
  readByLine,
  wait,
} from "./helpers.js";
import {
  MIN_ACC_SLEEP_SEC,
  MAX_ACC_SLEEP_SEC,
  MIN_TX_SLEEP_SEC,
  MAX_TX_SLEEP_SEC,
  EXPLORER_URL,
} from "./config.js";
import { getAccountResources, swapTokenToApt } from "./actions.js";
import logger from "./logger.js";
import Big from "big.js";

const FILE_PRIVATE_KEYS = "input/privateKeys.txt";

const tokens = [
  {
    symbol: "lzUSDC",
    decimals: 6,
    address:
      "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC",
    minSwap: 0.1,
  },
  {
    symbol: "lzUSDT",
    decimals: 6,
    address:
      "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT",
    minSwap: 0.1,
  },
  {
    symbol: "lzWETH",
    decimals: 6,
    address:
      "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH",
    minSwap: 0.00003,
  },
  {
    symbol: "stAPT",
    decimals: 8,
    address:
      "0xd11107bdf0d6d7040c6c0bfbdecb6545191fdf13e8d8d259952f53e1713f61b5::staked_coin::StakedAptos",
    minSwap: 0.007,
  },
  {
    symbol: "tAPT",
    decimals: 8,
    address:
      "0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin",
    minSwap: 0.007,
  },
];

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
      const resources = await getAccountResources(account);
      for (const token of tokens) {
        const balance = getTokenBalancesFromResources(resources, token.address);
        const readable = Big(balance).div(Big(10).pow(token.decimals));
        if (readable.lt(token.minSwap)) continue;
        const hash = await swapTokenToApt(account, token.address, balance);
        logger.info(
          `swap ${readable} ${token.symbol}: ${EXPLORER_URL}/${hash}`,
        );
        await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
      }
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
