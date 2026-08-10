/**
 * Stand-in role check. Manager sections are render-guarded on this, not hidden
 * with CSS. Swap the constant for a Graph /me/checkMemberGroups call against
 * the managers group (fail-safe to false) and keep the signature.
 */
const MOCK_IS_MANAGER = true;

export function isManagerView(): boolean {
  return MOCK_IS_MANAGER;
}
