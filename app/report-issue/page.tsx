import { Suspense } from 'react';
import { ReportIssueForm } from "@/components/report-issue-form";

function ReportIssueContent() {
  return <ReportIssueForm />;
}

export default function ReportIssuePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-3">
            Report Payment Issue
          </h1>
          <p className="text-muted-foreground">
            Having trouble with your payment? Let us know and we'll investigate.
          </p>
        </div>
        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
          <ReportIssueContent />
        </Suspense>
      </div>
    </div>
  );
}
