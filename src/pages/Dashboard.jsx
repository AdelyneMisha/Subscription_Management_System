
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import {
  DollarSign,
  Users,
  Repeat,
  TrendingUp
} from "lucide-react";

import StatCard from "../components/StatCard";

const revenueData = [
  { month: "Jan", revenue: 12000 },
  { month: "Feb", revenue: 18000 },
  { month: "Mar", revenue: 15000 },
  { month: "Apr", revenue: 23000 },
  { month: "May", revenue: 20000 },
  { month: "Jun", revenue: 28000 },
  { month: "Jul", revenue: 32000 },
  { month: "Aug", revenue: 30000 },
  { month: "Sep", revenue: 38000 },
  { month: "Oct", revenue: 42000 },
  { month: "Nov", revenue: 39000 },
  { month: "Dec", revenue: 48000 }
];

const paymentData = [
  { name: "Paid", value: 65 },
  { name: "Pending", value: 25 },
  { name: "Overdue", value: 10 }
];

const COLORS = ["#16a34a", "#f59e0b", "#ef4444"];

const invoices = [
  {
    id: "INV-001",
    customer: "John Smith",
    date: "Oct 28, 2026",
    amount: "₹4,999",
    status: "Paid"
  },
  {
    id: "INV-002",
    customer: "Sarah Wilson",
    date: "Oct 27, 2026",
    amount: "₹2,499",
    status: "Pending"
  },
  {
    id: "INV-003",
    customer: "David Brown",
    date: "Oct 26, 2026",
    amount: "₹7,999",
    status: "Paid"
  },
  {
    id: "INV-004",
    customer: "Emma Davis",
    date: "Oct 25, 2026",
    amount: "₹1,999",
    status: "Overdue"
  }
];

function Dashboard() {
    const [period, setPeriod] = useState("12");

  const filteredRevenueData = revenueData.slice(-Number(period));

  return (
    <div className="page-content">

      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening with your business.</p>
        </div>

        <select
  className="date-filter"
  value={period}
  onChange={(e) => setPeriod(e.target.value)}
>
  <option value="6">Last 6 Months</option>
  <option value="12">Last 12 Months</option>
</select>
      </div>

      <div className="stats-grid">

        <StatCard
          title="Total Revenue"
          value="₹4,85,000"
          change="+12.5%"
          icon={DollarSign}
          color="purple"
        />

        <StatCard
          title="Total Customers"
          value="1,248"
          change="+8.2%"
          icon={Users}
          color="blue"
        />

        <StatCard
          title="Active Subscriptions"
          value="856"
          change="+15.3%"
          icon={Repeat}
          color="green"
        />

        <StatCard
          title="Monthly Growth"
          value="18.6%"
          change="+4.5%"
          icon={TrendingUp}
          color="orange"
        />

      </div>

      <div className="charts-grid">

        <div className="content-card">
          <div className="card-heading">
            <div>
              <h3>Revenue Overview</h3>
              <p>Monthly revenue performance</p>
            </div>

            <span className="chart-tag">2026</span>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredRevenueData}>

                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#7c3aed"
                      stopOpacity={0.25}
                    />

                    <stop
                      offset="95%"
                      stopColor="#7c3aed"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e9eaf0"
                />

                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                />

              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="content-card">

          <div className="card-heading">
            <div>
              <h3>Payment Status</h3>
              <p>Invoice payment breakdown</p>
            </div>
          </div>

          <div className="pie-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>

                <Pie
                  data={paymentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                >
                  {paymentData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index]}
                    />
                  ))}
                </Pie>

                <Tooltip />

              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="payment-legend">
            {paymentData.map((item, index) => (
              <div key={item.name}>
                <span>
                  <i style={{ backgroundColor: COLORS[index] }}></i>
                  {item.name}
                </span>

                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>

        </div>
      </div>

      <div className="content-card table-card">

        <div className="card-heading">
          <div>
            <h3>Recent Invoices</h3>
            <p>Latest transactions from your customers</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>

            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.id}</td>
                  <td>{invoice.customer}</td>
                  <td>{invoice.date}</td>
                  <td>{invoice.amount}</td>

                  <td>
                    <span className={`status-badge ${invoice.status.toLowerCase()}`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;
