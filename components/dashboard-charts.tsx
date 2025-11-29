"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardChartsProps {
  sessions: any[];
  transactions: any[];
}

const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export function DashboardCharts({ sessions, transactions }: DashboardChartsProps) {
  // Daily sessions data
  const dailyData = useMemo(() => {
    const last7Days: any[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const daySessions = sessions.filter(s => 
        s.created_at?.split("T")[0] === dateStr
      );
      
      const dayRevenue = daySessions
        .filter(s => s.status === "completed")
        .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sessions: daySessions.length,
        revenue: dayRevenue,
        completed: daySessions.filter(s => s.status === "completed").length,
      });
    }
    
    return last7Days;
  }, [sessions]);

  // Chain distribution
  const chainData = useMemo(() => {
    const chains: Record<string, number> = {};
    
    sessions.forEach(s => {
      if (s.deposit_chain) {
        const [token] = s.deposit_chain.split("/");
        const name = token.toUpperCase();
        chains[name] = (chains[name] || 0) + 1;
      }
    });
    
    return Object.entries(chains).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  // Status distribution
  const statusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    
    sessions.forEach(s => {
      const status = s.status || "unknown";
      statuses[status] = (statuses[status] || 0) + 1;
    });
    
    return Object.entries(statuses).map(([name, value]) => ({ 
      name: name.replace("_", " "),
      value 
    }));
  }, [sessions]);

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Sessions Over Time */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Sessions & Revenue (Last 7 Days)</CardTitle>
          <CardDescription>Daily payment activity and revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px"
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="sessions" 
                stroke="#3b82f6" 
                name="Sessions"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                name="Revenue ($)"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chain Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Chains</CardTitle>
          <CardDescription>Distribution by blockchain</CardDescription>
        </CardHeader>
        <CardContent>
          {chainData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chainData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chainData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
              No chain data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Session Status</CardTitle>
          <CardDescription>Payment completion rate</CardDescription>
        </CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px"
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
              No status data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
