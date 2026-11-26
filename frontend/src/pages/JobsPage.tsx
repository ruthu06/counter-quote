import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getJobs } from '../api';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function JobsPage() {
  const { data: jobs, error } = useQuery({ queryKey: ['jobs'], queryFn: getJobs });

  if (error) return <p className="errors">{error.message}</p>;
  if (!jobs) return <p>Loading…</p>;

  return (
    <>
      <h1>Jobs</h1>
      <table>
        <thead>
          <tr><th>#</th><th>Customer</th><th>Title</th><th>Material</th><th>Total</th></tr>
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
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
