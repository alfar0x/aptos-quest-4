// eslint-disable-next-line no-unused-vars
import { AptosAccount } from "aptos";
import Big from "big.js";
import { addHours, millisecondsToSeconds } from "date-fns";
import client from "./client.js";
import tokens from "./tokens.js";
import { randomChoice, randomChoices, randomInt } from "./common.js";
import { generateRandomIntegersWithSum } from "./helpers.js";

const submitTx = async (
  /** @type {AptosAccount} */ account,
  /** @type {any} */ payload,
) => {
  const maxGasAmount = await client.estimateMaxGasAmount(account.address());

  const expirationSec = millisecondsToSeconds(
    addHours(new Date(), 1).getTime(),
  );

  const options = {
    max_gas_amount: maxGasAmount.toString(),
    expiration_timestamp_secs: expirationSec.toString(),
  };

  const rawTX = await client.generateTransaction(
    account.address().toString(),
    payload,
    options,
  );

  return await client.signAndSubmitTransaction(account, rawTX);
};

export const swapAptToUsdc = async (
  /** @type {AptosAccount} */ account,
  /** @type {Big.BigSource} */ aptNormalizedAmount,
) => {
  const payload = {
    function: `0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::scripts_v2::swap`,
    type_arguments: [
      tokens.apt.address,
      tokens.usdc.address,
      `0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated`,
    ],
    arguments: [aptNormalizedAmount, ""],
  };

  const hash = await submitTx(account, payload);

  return { hash };
};

export const ariesLendUsdc = async (
  /** @type {AptosAccount} */ account,
  /** @type {Big.BigSource} */ usdcNormalizedAmount,
) => {
  const payload = {
    function: `0x17f1e926a81639e9557f4e4934df93452945ec30bc962e11351db59eb0d78c33::aries::lend`,
    type_arguments: [tokens.usdc.address],
    arguments: [Big(usdcNormalizedAmount).toString()],
  };

  const hash = await submitTx(account, payload);

  return { hash };
};

export const swapAptToCell = async (
  /** @type {AptosAccount} */ account,
  /** @type {Big.BigSource} */ aptNormalizedAmount,
) => {
  const minAmountOutPayload = {
    function:
      "0x4bf51972879e3b95c4781a5cdcb9e1ee24ef483e7d22f2d903626f126df62bd1::router::get_amounts_out",
    type_arguments: [],
    arguments: [
      Big(aptNormalizedAmount).toString(),
      "0xedc2704f2cef417a06d1756a04a16a9fa6faaed13af469be9cdfcac5a21a8e2e",
      ["0x2ebb2ccac5e027a87fa0e2e5f656a3a4238d6a48d93ec9b610d570fc0aa0df12"],
      [false],
    ],
  };

  const minAmountOutView = await client.view(minAmountOutPayload);

  const payload = {
    function:
      "0x4bf51972879e3b95c4781a5cdcb9e1ee24ef483e7d22f2d903626f126df62bd1::router::swap_route_entry_from_coin",
    type_arguments: ["0x1::aptos_coin::AptosCoin"],
    arguments: [
      Big(aptNormalizedAmount).toString(),
      minAmountOutView[0],
      ["0x2ebb2ccac5e027a87fa0e2e5f656a3a4238d6a48d93ec9b610d570fc0aa0df12"],
      [false],
      account.address().toString(),
    ],
  };

  const hash = await submitTx(account, payload);

  return { hash, cellNormalizedAmount: minAmountOutView[0].toString() };
};

export const createLock = async (
  /** @type {AptosAccount} */ account,
  /** @type {Big.BigSource} */ cellNormalizedAmount,
) => {
  const weeksAmount = randomChoice([2, 4, 24, 52, 104]);

  const payload = {
    function:
      "0x4bf51972879e3b95c4781a5cdcb9e1ee24ef483e7d22f2d903626f126df62bd1::voting_escrow::create_lock_entry",
    type_arguments: [],
    arguments: [Big(cellNormalizedAmount).toString(), weeksAmount.toString()],
  };

  const hash = await submitTx(account, payload);

  return { hash };
};

export const vote = async (/** @type {any} */ account) => {
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

  const payload = {
    function:
      "0x4bf51972879e3b95c4781a5cdcb9e1ee24ef483e7d22f2d903626f126df62bd1::vote_manager::vote",
    type_arguments: [],
    arguments: [
      "0xc727728a38149e26c9f0ca6b2301af7aa8cb82c2ddb7fc455b33dac114a05927",
      voteOptions,
      percents,
    ],
  };

  const hash = await submitTx(account, payload);

  return { hash };
};
