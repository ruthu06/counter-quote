import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getJob } from '../api';

export function JobPage() {
  const id = Number(useParams().id);
  const { data: job, error } = useQuery({ queryKey: ['jobs', id], queryFn: () => getJob(id) });

  if (error) return <p className="errors">{error.message}</p>;
  if (!job) return <p>Loading…</p>;

  return (
    <>
      <h1>{job.customerName}</h1>
      <p className="muted">{job.material}</p>
      <section className="card">
        <p className="muted">Your drawing and price go here.</p>
      </section>
    </>
  );
}
