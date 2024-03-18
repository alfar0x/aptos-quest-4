// eslint-disable-next-line no-unused-vars
import { AptosAccount } from "aptos";
import Big from "big.js";
import {
  swapAptToUsdc,
  ariesLendUsdc,
  swapAptToCell,
  createLock,
  vote,
} from "./actions.js";
import { wait, randomInt } from "./common.js";
import {
  MIN_USDC_TO_SUPPLY,
  MAX_USDC_TO_SUPPLY,
  EXPLORER_URL,
  MIN_TX_SLEEP_SEC,
  MAX_TX_SLEEP_SEC,
  MIN_APT_TO_CELL_SWAP,
  MAX_APT_TO_CELL_SWAP,
  MIN_CELL_PERCENT_TO_LOCK,
  MAX_CELL_PERCENT_TO_LOCK,
  MAX_CELL_TO_LOCK,
} from "./config.js";
import tokens from "./tokens.js";
import logger from "./logger.js";
import {
  getTokenBalance,
  readableToNormalized,
  normalizedToReadable,
  readableToUsd,
} from "./helpers.js";

const worker = async (/** @type {AptosAccount} */ account) => {
  const aptBalance = await getTokenBalance(account, tokens.apt);
  let usdcBalance = await getTokenBalance(account, tokens.usdc);

  logger.info(
    `balances: ${aptBalance.readable} APT ($${aptBalance.usd}) | ${usdcBalance.readable} USDC`,
  );

  if (Big(usdcBalance.readable).lt(MIN_USDC_TO_SUPPLY)) {
    const usdcNormalizedAmountToBuy = randomInt(
      readableToNormalized(MIN_USDC_TO_SUPPLY, tokens.usdc.decimals),
      readableToNormalized(MAX_USDC_TO_SUPPLY, tokens.usdc.decimals),
    );

    const aptReadableAmount = Big(
      normalizedToReadable(usdcNormalizedAmountToBuy, tokens.usdc.decimals),
    ).div(tokens.apt.price);

    const aptNormalizedAmountToSell = readableToNormalized(
      aptReadableAmount,
      tokens.apt.decimals,
    );

    const { hash: swapHash } = await swapAptToUsdc(
      account,
      aptNormalizedAmountToSell,
    );

    const readableUsdcSwapReadableAmount = normalizedToReadable(
      usdcNormalizedAmountToBuy,
      tokens.usdc.decimals,
    );

    const readableAptSwapReadableAmount = normalizedToReadable(
      aptNormalizedAmountToSell,
      tokens.apt.decimals,
    );
    const usdAptSwapAmount = readableToUsd(
      readableAptSwapReadableAmount,
      tokens.apt.price,
    );

    logger.info(
      `swap ${readableAptSwapReadableAmount} APT ($${usdAptSwapAmount}) -> ${readableUsdcSwapReadableAmount} USDC: ${EXPLORER_URL}/${swapHash}`,
    );

    await wait(2);

    usdcBalance = await getTokenBalance(account, tokens.usdc);

    logger.info(`new USDC balance: ${usdcBalance.readable}`);

    await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);
  }

  const usdcNormalizedAmountToSupply = randomInt(
    readableToNormalized(MIN_USDC_TO_SUPPLY, tokens.usdc.decimals),
    usdcBalance.normalized,
  );

  const { hash: lendHash } = await ariesLendUsdc(
    account,
    usdcNormalizedAmountToSupply,
  );

  const usdcReadableAmountToSupply = normalizedToReadable(
    usdcNormalizedAmountToSupply,
    tokens.usdc.decimals,
  );

  logger.info(
    `supply ${usdcReadableAmountToSupply} USDC: ${EXPLORER_URL}/${lendHash}`,
  );

  await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);

  const aptNormalizedAmountSwapToCell = randomInt(
    readableToNormalized(MIN_APT_TO_CELL_SWAP, tokens.apt.decimals),
    readableToNormalized(MAX_APT_TO_CELL_SWAP, tokens.apt.decimals),
  );

  const { hash: swapAptToCellHash, cellNormalizedAmount } = await swapAptToCell(
    account,
    aptNormalizedAmountSwapToCell,
  );

  const aptReadableAmountSwapToCell = normalizedToReadable(
    aptNormalizedAmountSwapToCell,
    tokens.apt.decimals,
  );
  const cellReadableAmount = normalizedToReadable(
    cellNormalizedAmount,
    tokens.cell.decimals,
  );

  const aptUsdAmountToCell = readableToUsd(
    aptReadableAmountSwapToCell,
    tokens.apt.price,
  );
  const cellUsdAmount = readableToUsd(cellReadableAmount, tokens.cell.price);

  logger.info(
    `swap ${aptReadableAmountSwapToCell} APT ($${aptUsdAmountToCell}) -> ${cellReadableAmount} CELL ($${cellUsdAmount}): ${EXPLORER_URL}/${swapAptToCellHash}`,
  );

  await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);

  const cellNormalizedAmountToLock = randomInt(
    Big(cellNormalizedAmount)
      .div(100)
      .times(MIN_CELL_PERCENT_TO_LOCK)
      .round()
      .toNumber(),
    Math.max(
      Big(cellNormalizedAmount)
        .div(100)
        .times(MAX_CELL_PERCENT_TO_LOCK)
        .round()
        .toNumber(),
      MAX_CELL_TO_LOCK,
    ),
  );

  const { hash: lockHash } = await createLock(
    account,
    cellNormalizedAmountToLock,
  );

  const cellReadableAmountToLock = normalizedToReadable(
    cellNormalizedAmountToLock,
    tokens.cell.decimals,
  );

  const cellUsdAmountToLock = readableToUsd(
    cellReadableAmountToLock,
    tokens.cell.price,
  );
  logger.info(
    `lock ${cellReadableAmountToLock} CELL ($${cellUsdAmountToLock}): ${EXPLORER_URL}/${lockHash}`,
  );

  await wait(MIN_TX_SLEEP_SEC, MAX_TX_SLEEP_SEC);

  const { hash: voteHash } = await vote(account);

  logger.info(`vote: ${EXPLORER_URL}/${voteHash}`);
};

export default worker;
