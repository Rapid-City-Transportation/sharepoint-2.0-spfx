import { ICustomer } from '../components/types';

/**
 * Shared predicate for the customer search used by BOTH the nav bar
 * ("Search for Contact Cards") and the page ("Search Customers"). It matches
 * the query anywhere in the customer's precomputed `searchText` blob, which
 * includes the name, type, role, phone/email, and the during/after-hours,
 * business-hours, and special-instructions text. That is what lets an agent
 * find a hospital (e.g. "Credit Valley") by typing its name even though the
 * card itself is the umbrella company's page (e.g. "Trillium").
 *
 * `lowerQuery` must already be trimmed and lowercased (callers do this once).
 */
export function customerMatchesQuery(customer: ICustomer, lowerQuery: string): boolean {
  if (!lowerQuery) return false;
  return (customer.searchText || '').indexOf(lowerQuery) !== -1;
}
