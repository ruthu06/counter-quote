import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../api';
import { MATERIALS, isMaterial } from '../lib/materials';

export function NewJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');
  const [material, setMaterial] = useState(MATERIALS[0]);

  const save = useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate(`/jobs/${job.id}`);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ customerName, material, title: title.trim() });
  };

  return (
    <>
      <h1>New job</h1>
      {save.error && <p className="errors">{save.error.message}</p>}
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Customer
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </label>
        <label>
          Title (optional)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Kitchen countertop"
            maxLength={100}
          />
        </label>
        <label>
          Material
          <select value={material} onChange={(e) => isMaterial(e.target.value) && setMaterial(e.target.value)}>
            {MATERIALS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <button type="submit" className="button" disabled={save.isPending}>Save job</button>
      </form>
    </>
  );
}
