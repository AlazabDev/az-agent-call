import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Accounts from "@/pages/Accounts";
import AgentChat from "@/pages/AgentChat";
import Agents from "@/pages/Agents";
import Clients from "@/pages/Clients";
import Dashboard from "@/pages/Dashboard";
import Finance from "@/pages/Finance";
import FlowBuilder from "@/pages/FlowBuilder";
import Flows from "@/pages/Flows";
import FoundrySettings from "@/pages/FoundrySettings";
import Inbox from "@/pages/Inbox";
import Login from "@/pages/Login";
import Maintenance from "@/pages/Maintenance";
import NotFound from "@/pages/NotFound";
import Projects from "@/pages/Projects";
import Settings from "@/pages/Settings";
import Teams from "@/pages/Teams";
import Templates from "@/pages/Templates";
import Webhooks from "@/pages/Webhooks";
import WhatsAppHub from "@/pages/WhatsAppHub";

export default function App() {
	return (
		<Routes>
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
		</Routes>
	);
}
