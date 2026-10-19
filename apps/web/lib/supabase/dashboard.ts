import { createClient } from '@/lib/supabase/client';
import { DashboardSummarySchema, type DashboardSummary } from '@/types';

export async function fetchDashboardSummary(timezone: string): Promise<DashboardSummary> {
  const { data, error } = await createClient().rpc('get_dashboard_summary', {
    p_timezone: timezone,
  });
  if (error) throw error;
  return DashboardSummarySchema.parse(data);
}
