export interface IITSupportProps {
  /** URL of the IT public page, used by the "Back to the IT page" link. */
  publicPageUrl: string;
  /** Signed-in user's display name (for a friendly confirmation). */
  userDisplayName: string;
  /** Signed-in user's email, stored on the ticket for follow-up. */
  userEmail: string;
}
