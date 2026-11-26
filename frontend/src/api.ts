export interface Job {
  id: number;
  customerName: string;
  material: string;
  createdDate: string;
  /** e.g. "Kitchen countertop"; may be empty. */
  title: string;
  /** The saved drawing as JSON (see lib/designStorage); empty until first saved. */
  designJson: string;
  /** Estimated total when last saved; 0 until then. */
  quoteTotal: number;
}

/** Material is chosen per countertop and filled in on save, so a new job only needs these. */
export type NewJob = Pick<Job, 'customerName' | 'title'>;

export type PricingCategory = 'Material' | 'Edge' | 'Corner' | 'Sink';
/** What the price is multiplied by: area, edge length, or a count. */
export type PricingUnit = 'sqft' | 'linearft' | 'each';

export interface PricingItem {
  id: number;
  category: PricingCategory;
  name: string;
  price: number;
  unit: PricingUnit;
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const reasons = problem?.errors ? Object.values(problem.errors).flat().join(' ') : '';
    throw new Error(reasons || `Request failed (${response.status})`);
  }
  // 204 No Content (e.g. after a delete) has no body to read.
  return response.status === 204 ? (undefined as T) : response.json();
}

export const getJobs = () => request<Job[]>('/api/jobs');
export const getJob = (id: number) => request<Job>(`/api/jobs/${id}`);
export const createJob = (job: NewJob) => request<Job>('/api/jobs', 'POST', job);
export const updateJob = (job: Job) => request<Job>(`/api/jobs/${job.id}`, 'PUT', job);
export const getPricing = () => request<PricingItem[]>('/api/pricing');
export const deleteJob = (id: number) => request<void>(`/api/jobs/${id}`, 'DELETE');
