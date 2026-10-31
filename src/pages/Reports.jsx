
import {
  FileText,
  Download,
  TrendingUp,
  CreditCard,
  Users,
  CalendarDays
} from "lucide-react";

const reports = [
  {
    title: "Revenue Report",
    description: "View total revenue and monthly earnings.",
    icon: TrendingUp,
    date: "October 2026"
  },
  {
    title: "Subscription Report",
    description: "Review active, cancelled and expired subscriptions.",
    icon: Users,
    date: "October 2026"
  },
  {
    title: "Payment Report",
    description: "Track completed, pending and overdue payments.",
    icon: CreditCard,
    date: "October 2026"
  },
  {
    title: "Invoice Report",
    description: "View generated invoices and billing records.",
    icon: FileText,
    date: "October 2026"
  }
];

function Reports() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-content">

      <div className="page-heading">
        <div>
          <h1>Reports</h1>
          <p>Generate and review business reports.</p>
        </div>

        <button className="primary-button" onClick={handlePrint}>
          <Download size={17} />
          Print Reports
        </button>
      </div>

      <div className="reports-grid">

        {reports.map((report) => {
          const Icon = report.icon;

          return (
            <div className="content-card report-card" key={report.title}>

              <div className="report-icon">
                <Icon size={24} />
              </div>

              <h3>{report.title}</h3>
              <p>{report.description}</p>

              <div className="report-footer">
                <span>
                  <CalendarDays size={15} />
                  {report.date}
                </span>

                <button onClick={handlePrint}>
                  <Download size={16} />
                  Print
                </button>
              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}

export default Reports;
