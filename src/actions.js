/* eslint-disable camelcase */
// eslint-disable-next-line no-unused-vars
import { AptosAccount, AptosClient, Provider } from "aptos";
import {
  randomChoices,
  randomInt,
  generateRandomIntegersWithSum,
  wait,
} from "./helpers.js";
import { TIMES_TO_RETRY_TX } from "./config.js";
import logger from "./logger.js";
import Big from "big.js";

const { RPC_URL } = process.env;

const client = new AptosClient(RPC_URL);
const provider = new Provider("mainnet");

const MAX_CELL_TO_LOCK = 100000000;

const getCellBalance = async (account) => {
  const coins = await provider.getAccountCoinsData(account.address());
  const coin = coins.current_fungible_asset_balances.find(
    (c) =>
      c.asset_type ===
      "0x2ebb2ccac5e027a87fa0e2e5f656a3a4238d6a48d93ec9b610d570fc0aa0df12",
  );
  if (!coin) throw new Error("Cell is not found");
  const amount = Big(coin.amount).gt(MAX_CELL_TO_LOCK)
    ? randomInt(10, MAX_CELL_TO_LOCK)
    : coin.amount;

  return String(amount);
};

const getV2TokenID = async (account) => {
  const tokenData = await provider.getTokenOwnedFromCollectionAddress(
    account.address(),
    "0x30e2f18b1f9c447e7dadd7a05966e721ab6512b81ee977cb053edb86cc1b1d65",
    { tokenStandard: "v2" },
  );

  if (tokenData.current_token_ownerships_v2.length === 0) {
    throw Error("Get token ID Error");
  }

  return tokenData.current_token_ownerships_v2[0].token_data_id;
};

const submitTx = async (
  /** @type {AptosAccount} */ account,
  /** @type {any} */ payload,
) => {
  let retries = TIMES_TO_RETRY_TX;

  while (retries >= 1) {
    try {
      const max_gas_amount = await client.estimateMaxGasAmount(
        account.address(),
      );
      const options = { max_gas_amount: max_gas_amount.toString() };

      const rawTX = await client.generateTransaction(
        account.address(),
        payload,
        options,
      );
      const txHash = await client.signAndSubmitTransaction(account, rawTX);

      const txResult = await client.waitForTransactionWithResult(txHash);

      if (!txResult.success) throw new Error("Transaction failed");

      return txResult.hash;
    } catch (error) {
      logger.error(error.message);
      console.error(error, payload);
      await wait(10, 40);
    }

    retries -= 1;
  }
};

export const swapAptToUsdt = async (/** @type {AptosAccount} */ account) => {
  const payload = {
    function:
      "0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa::router::swap_exact_input",
    type_arguments: [
      "0x1::aptos_coin::AptosCoin",
      "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT",
    ],
    arguments: ["100000", "10000"],
  };

  return await submitTx(account, payload);
};

export const ariesLendUsdt = async (/** @type {AptosAccount} */ account) => {
  const payload = {
    function:
      "0x17f1e926a81639e9557f4e4934df93452945ec30bc962e11351db59eb0d78c33::aries::lend",
    type_arguments: [
      "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT",
    ],
    arguments: ["10000"],
  };

  return await submitTx(account, payload);
};

export const swapAptToCell = async (/** @type {AptosAccount} */ account) => {
  const payload = {
    function:
      "0x4bf51972879e3b95c4781a5cdcb9e1ee24ef483e7d22f2d903626f126df62bd1::router::swap_route_entry_from_coin",
    type_arguments: ["0x1::aptos_coin::AptosCoin"],
    arguments: [
      "100000",
      "0",
      ["0x2ebb2ccac5e027a87fa0e2e5f656a3a4238d6a48d93ec9b610d570fc0aa0df12"],
      ["false"],
      account.address().hex(),
    ],
  };

  return await submitTx(account, payload);
};

export const createLock = async (/** @type {AptosAccount} */ account) => {
  // const weeksAmount = randomChoice([2, 4, 24, 52, 104]);
  const weeksAmount = "2";
  const cellBalance = await getCellBalance(account);

  const payload = {
    function:
      "0x4bf51972879e3b95c4781a5cdcb9e1ee24ef483e7d22f2d903626f126df62bd1::voting_escrow::create_lock_entry",
    type_arguments: [],
    arguments: [cellBalance, String(weeksAmount)],
  };

  return await submitTx(account, payload);
};

export const vote = async (/** @type {AptosAccount} */ account) => {
  const votesCount = randomInt(1, 3);

  const voteOptions = randomChoices(
    [
      "0x85d3337c4ca94612f278c5164d2b21d0d83354648bf9555272b5f9d8f1f33b2a",
      "0x234f0be57d6acfb2f0f19c17053617311a8d03c9ce358bdf9cd5c460e4a02b7c",
      "0x1ef2be2a92393c09ac5bc5e5b934a831611ebab5c4f2419d1d35f0552abec5f6",
      "0xcd50c2dac7b902a653dc602faaa6ef7b81084fce365050593fea0f3bee96f6be",
      "0x1e9cf70ab184026fa1eafc3cc4a4bd0012418425049e60856ea249f72f94ba8a",
      "0x45a72801a76b89bb3786f693db1a23bcc2e80dbf69b53ad8405111cdc69595ba",
      "0xe3939aa0732d67dc0a4e2b5072a7975a0d279c8e93a2756f39ae4c0e5b9abcca",
      "0x5669f388059383ab806e0dfce92196304205059874fd845944137d96bbdfc8de",
      "0xf7d4a97f8a82b1454cd69f92b5a5bd5bcad609e44a6cf56377755adcfca5863a",
    ],
    votesCount,
  );

  const percents = generateRandomIntegersWithSum(votesCount, 100).map(String);

  const tokenId = await getV2TokenID(account);

  const payload = {
    function:
      "0x4bf51972879e3b95c4781a5cdcb9e1ee24ef483e7d22f2d903626f126df62bd1::vote_manager::vote",
    type_arguments: [],
    arguments: [tokenId, voteOptions, percents],
  };

  return await submitTx(account, payload);
};
