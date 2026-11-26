import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type Job, deleteJob, getJobs } from '../api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import styles from './JobsPage.module.css';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function JobsPage() {
  const queryClient = useQueryClient();
  const { data: jobs, error } = useQuery({ queryKey: ['jobs'], queryFn: getJobs });
  // The job waiting for "Delete" to be confirmed, if any.
  const [toDelete, setToDelete] = useState<Job | null>(null);
  const remove = useMutation({
    mutationFn: deleteJob,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['jobs', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'], exact: true });
    },
  });

  if (error) return <p className="errors">{error.message}</p>;
  if (!jobs) return <p>Loading…</p>;

  return (
    <>
      <h1>Jobs</h1>
      {remove.error && <p className="errors">Couldn’t delete the job: {remove.error.message}</p>}
      {jobs.length === 0 ? (
        <p className="muted">No jobs yet. Use New job to start one.</p>
      ) : (
        <table>
          <thead>
            <tr><th>#</th><th>Customer</th><th>Title</th><th>Materials</th><th>Total</th><th><span className={styles.hidden}>Actions</span></th></tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td><Link to={`/jobs/${job.id}`}>{job.customerName}</Link></td>
                <td>{job.title || <span className="muted">—</span>}</td>
                <td>{job.material}</td>
                {/* The total from the last save; jobs never saved with a drawing have none yet. */}
                <td>{job.designJson ? dollars.format(job.quoteTotal) : <span className="muted">Not quoted</span>}</td>
                <td className={styles.actions}>
                  <button
                    type="button"
                    className={styles.delete}
                    disabled={remove.isPending && remove.variables === job.id}
                    aria-label={`Delete job ${job.id} for ${job.customerName}`}
                    onClick={() => setToDelete(job)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this job?"
        confirmLabel="Delete job"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      >
        {toDelete && (
          <>
            <strong>{[toDelete.customerName.trim(), toDelete.title].filter(Boolean).join(' — ')}</strong> and its drawing
            and quote will be deleted. This can’t be undone.
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
