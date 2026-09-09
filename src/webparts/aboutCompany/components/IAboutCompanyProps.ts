/** Which About the Company section a page hosts. 'all' keeps the original
 *  single-page layout; the nav dropdown points at one page per section so no
 *  page is absurdly long. */
export type AboutSection = 'all' | 'mvv' | 'history' | 'leadership' | 'qms';

export interface IAboutCompanyProps {
  /** Section for this page instance; unset behaves as 'all'. */
  section?: AboutSection;
  /** Stream / SharePoint embed URL for the MVV video. Empty until launch. */
  videoUrl?: string;
}
