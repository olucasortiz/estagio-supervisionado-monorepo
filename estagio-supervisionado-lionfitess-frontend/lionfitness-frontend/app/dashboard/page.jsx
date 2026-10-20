import DashboardLayout from "../../components/layout/DashboardLayout";
import DashboardContent from "../../components/dashboard/DashboardContent";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import "./graphite.css";
import "./overview.css";
import "./registry.css";
import "./finance.css";
import "./microkit-focus.css";
import "./reports.css";
import "./catalog.css";

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
