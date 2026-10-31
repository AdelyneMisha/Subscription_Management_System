
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Layers,
  Repeat,
  FileText,
  Receipt,
  Tag,
  CreditCard,
  ChartNoAxesCombined,
  FileBarChart,
  Users,
  Settings,
  LogOut
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Products", path: "/products", icon: Package },
  { name: "Plans", path: "/plans", icon: Layers },
  { name: "Subscriptions", path: "/subscriptions", icon: Repeat },
  { name: "Quotations", path: "/quotations", icon: FileText },
  { name: "Invoices", path: "/invoices", icon: Receipt },
  { name: "Discounts", path: "/discounts", icon: Tag },
  { name: "Payments", path: "/payments", icon: CreditCard },
  { name: "Analytics", path: "/analytics", icon: ChartNoAxesCombined },
  { name: "Reports", path: "/reports", icon: FileBarChart },
  { name: "Users", path: "/users", icon: Users },
  { name: "Settings", path: "/settings", icon: Settings }
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">S</div>
        <span>Subscript</span>
      </div>

      <p className="menu-label">MAIN MENU</p>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-link">
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
