import {
  hasStatusTxReviewSkip,
  parseStatusTxReviewAmount,
  parseStatusTxReviewConfig,
} from "./status-tx-review";

test("enables tx review from URL only when the environment allows it", () => {
  expect(parseStatusTxReviewConfig("?gmTxReview=1", true).active).toBe(true);
  expect(parseStatusTxReviewConfig("?gmTxReview=1", false).active).toBe(false);
  expect(parseStatusTxReviewConfig("", true).active).toBe(false);
});

test("parses known skip flags and ignores unknown flags", () => {
  const config = parseStatusTxReviewConfig(
    "?gmTxReview=1&gmSkip=predeposit,unknown,receipt,send",
    true,
  );

  expect(hasStatusTxReviewSkip(config, "predeposit")).toBe(true);
  expect(hasStatusTxReviewSkip(config, "receipt")).toBe(true);
  expect(hasStatusTxReviewSkip(config, "send")).toBe(true);
  expect(hasStatusTxReviewSkip(config, "allowance")).toBe(false);
});

test("parses manual advance amounts as base-unit integers", () => {
  expect(parseStatusTxReviewAmount("1000000", "amount")).toBe(BigInt(1000000));
  expect(parseStatusTxReviewAmount(BigInt(2), "amount")).toBe(BigInt(2));
  expect(() => parseStatusTxReviewAmount("1.5", "amount")).toThrow(/base-unit/);
});
