
function StatCard({ title, value, change, icon: Icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{title}</span>

        <div className={`stat-icon ${color}`}>
          <Icon size={21} />
        </div>
      </div>

      <h2>{value}</h2>

      <p className="stat-change">
        {change} compared to last month
      </p>
    </div>
  );
}

export default StatCard;
