// Saving a job: all its countertops (with their positions), the title and the quoted total.
// Sends the whole job (PUT replaces it), remembers what was last saved, and says whether
// anything has changed since.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type Job, updateJob } from '../api';
import { type JobDesign, parseJobDesign, serializeJobDesign } from '../lib/designStorage';

/** The job's materials for the jobs list, e.g. "Quartz, Granite"; empty until something is drawn. */
function materialsOf(jobDesign: JobDesign): string {
  const materials = jobDesign.countertops.flatMap((c) => (c.design ? [c.design.material] : []));
  return [...new Set(materials)].join(', ');
}

export function useSaveJob(job: Job, jobDesign: JobDesign, title: string) {
  const queryClient = useQueryClient();
  // What's in the database, written the same way as below, so the two compare as text.
  const [savedJson, setSavedJson] = useState(() => serializeJobDesign(parseJobDesign(job.designJson)));
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

  const json = serializeJobDesign(jobDesign);
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
    unsaved,
    saving: mutation.isPending,
    error: mutation.error,
    save: (quoteTotal: number) =>
      mutation.mutate({ ...job, title: cleanTitle, material: materialsOf(jobDesign), designJson: json, quoteTotal }),
  };
}
