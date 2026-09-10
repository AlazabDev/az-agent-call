import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Agents from "@/pages/Agents";
import AgentChat from "@/pages/AgentChat";
import FoundrySettings from "@/pages/FoundrySettings";
import Accounts from "@/pages/Accounts";
import Templates from "@/pages/Templates";
import Flows from "@/pages/Flows";
import FlowBuilder from "@/pages/FlowBuilder";
import Projects from "@/pages/Projects";
import Clients from "@/pages/Clients";
import Maintenance from "@/pages/Maintenance";
import Teams from "@/pages/Teams";
import Webhooks from "@/pages/Webhooks";
import WhatsAppHub from "@/pages/WhatsAppHub";
import Inbox from "@/pages/Inbox";
import Finance from "@/pages/Finance";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/chat" element={<AgentChat />} />
      <Route path="/foundry" element={<FoundrySettings />} />
      <Route path="/agents" element={<Agents />} />
      <Route path="/whatsapp" element={<WhatsAppHub />} />
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/flows" element={<Flows />} />
      <Route path="/flows/new" element={<FlowBuilder />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/webhooks" element={<Webhooks />} />
      <Route path="/inbox" element={<Inbox />} />
      <Route path="/send-log" element={<Navigate to="/inbox" replace />} />
      <Route path="/finance" element={<Finance />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="/home" element={<Navigate to="/" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>;
}
