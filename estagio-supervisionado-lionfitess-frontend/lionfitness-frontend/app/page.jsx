import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardContent from "../components/dashboard/DashboardContent";
import ProtectedRoute from "../components/auth/ProtectedRoute";

export default function HomePage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
