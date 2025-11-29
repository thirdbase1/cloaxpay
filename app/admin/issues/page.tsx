import { createClient } from "@/lib/supabase/server";
import { AdminIssuesClient } from "@/components/admin-issues-client";

export default async function AdminIssuesPage() {
  const supabase = await createClient();
  
  const { data: issues } = await supabase
    .from("issue_reports")
    .select(`
      *,
      merchants(business_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Issue Reports</h1>
        <p className="text-muted-foreground mt-2">
          Manage and resolve customer-reported payment issues
        </p>
      </div>
      
      <AdminIssuesClient initialIssues={issues || []} />
    </div>
  );
}
