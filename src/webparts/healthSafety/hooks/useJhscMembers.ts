import * as React from 'react';
import { fetchJhscMembers, IJhscMember } from '../services/jhscService';

/** Loads the JHSC roster. Any error (list missing, no access) resolves to an
 *  empty roster so the page renders its create-the-list hint instead of dying. */
export function useJhscMembers(): { members: IJhscMember[]; loading: boolean } {
  const [members, setMembers] = React.useState<IJhscMember[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchJhscMembers()
      .then(items => {
        if (!cancelled) setMembers(items);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { members, loading };
}
