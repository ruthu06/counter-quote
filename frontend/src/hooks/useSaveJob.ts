// Saving a job's design and title: sends the whole job (PUT replaces it), remembers what was
// last saved, and says whether anything has changed since.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type Job, updateJob } from '../api';
import { parseDesign, serializeDesign } from '../lib/designStorage';
import type { Design } from '../lib/geometry';

export function useSaveJob(job: Job, design: Design, title: string) {
  const queryClient = useQueryClient();
  // What's in the database, in the same form serializeDesign writes, so they compare as text.
  const [savedJson, setSavedJson] = useState(() => {
    const saved = parseDesign(job.designJson);
    return saved ? serializeDesign(saved) : '';
  });
  const [savedTitle, setSavedTitle] = useState(job.title);

  const mutation = useMutation({
    mutationFn: updateJob,
    onSuccess: (saved) => {
      setSavedJson(saved.designJson);
      setSavedTitle(saved.title);
      queryClient.setQueryData(['jobs', saved.id], saved);
      // Only the list; refetching this job isn't needed, it was just saved.
      queryClient.invalidateQueries({ queryKey: ['jobs'], exact: true });
    },
  });

  const json = serializeDesign(design);
  const neverSaved = savedJson === '';
  const cleanTitle = title.trim();
  const unsaved = json !== savedJson || cleanTitle !== savedTitle;

  // Warn before closing or reloading the tab with unsaved changes.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  return {
    neverSaved,
    unsaved,
    saving: mutation.isPending,
    error: mutation.error,
    /** Material is copied to the job too, so the jobs list matches the drawing. */
    save: (quoteTotal: number) =>
      mutation.mutate({ ...job, title: cleanTitle, material: design.material, designJson: json, quoteTotal }),
  };
}
