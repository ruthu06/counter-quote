import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../api';

export function NewJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');

  const save = useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate(`/jobs/${job.id}`);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ customerName, title: title.trim() });
  };

  return (
    <>
      <h1>New job</h1>
      {save.error && <p className="errors">{save.error.message}</p>}
      <form className="card form" onSubmit={handleSubmit}>
        <label className="field">
          Customer
          <input className="control" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </label>
        <label className="field">
          Title (optional)
          <input
            className="control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Kitchen project"
            maxLength={100}
          />
        </label>
        <button type="submit" className="button" disabled={save.isPending}>Save job</button>
      </form>
    </>
  );
}
