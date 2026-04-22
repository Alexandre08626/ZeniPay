// Routes a funding source to its provider by type. Unimplemented sources
// throw FundingSourceNotImplemented so the API layer surfaces a clean 501.

import { finixCardProvider } from "./finix-source";
import { zenipayMerchantProvider } from "./zenipay-merchant-source";
import type { FundingSourceProvider } from "./interface";
import { FundingSourceNotImplemented } from "./interface";
import type { FundingSourceType } from "../types";

const registry = new Map<FundingSourceType, FundingSourceProvider>([
  [finixCardProvider.type, finixCardProvider],
  [zenipayMerchantProvider.type, zenipayMerchantProvider],
]);

export function getProvider(type: FundingSourceType): FundingSourceProvider {
  const p = registry.get(type);
  if (!p || !p.enabled) throw new FundingSourceNotImplemented(type);
  return p;
}
