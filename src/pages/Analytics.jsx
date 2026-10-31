
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

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

const subscriptionData = [
  { month: "Jan", subscriptions: 120 },
  { month: "Feb", subscriptions: 145 },
  { month: "Mar", subscriptions: 180 },
  { month: "Apr", subscriptions: 210 },
  { month: "May", subscriptions: 245 },
  { month: "Jun", subscriptions: 290 },
  { month: "Jul", subscriptions: 320 },
  { month: "Aug", subscriptions: 365 },
  { month: "Sep", subscriptions: 410 },
  { month: "Oct", subscriptions: 450 },
  { month: "Nov", subscriptions: 490 },
  { month: "Dec", subscriptions: 530 }
];

function Analytics() {
  return (
    <div className="page-content">

      <div className="page-heading">
        <div>
          <h1>Analytics</h1>
          <p>Track your business performance and growth.</p>
        </div>
      </div>

      <div className="stats-grid">

        <div className="stat-card">
          <span>Total Revenue</span>
          <h2>₹4,85,000</h2>
          <p className="stat-change">+12.5% compared to last month</p>
        </div>

        <div className="stat-card">
          <span>Average Revenue</span>
          <h2>₹40,416</h2>
          <p className="stat-change">Monthly average</p>
        </div>

        <div className="stat-card">
          <span>New Subscriptions</span>
          <h2>530</h2>
          <p className="stat-change">+18.6% this year</p>
        </div>

        <div className="stat-card">
          <span>Retention Rate</span>
          <h2>92.4%</h2>
          <p className="stat-change">+3.2% this month</p>
        </div>

      </div>

      <div className="content-card analytics-chart">
        <div className="card-heading">
          <div>
            <h3>Revenue Trends</h3>
            <p>Revenue generated throughout the year</p>
          </div>
        </div>

        <div className="large-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#7c3aed"
                fill="#ede9fe"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="content-card analytics-chart">
        <div className="card-heading">
          <div>
            <h3>Subscription Growth</h3>
            <p>New subscriptions added each month</p>
          </div>
        </div>

        <div className="large-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subscriptionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />

              <Bar
                dataKey="subscriptions"
                fill="#8b5cf6"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

export default Analytics;
