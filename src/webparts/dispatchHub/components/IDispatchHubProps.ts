export interface IDispatchHubProps {
  /** Welcome card title (property pane). */
  title: string;
  /** Welcome card subtitle (property pane). */
  subtitle: string;
  /** The signed-in viewer, for weekend sign-ups: the name written into the
   *  list and the login that marks a row as theirs. */
  userDisplayName: string;
  userLogin: string;
}
