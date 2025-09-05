
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Processos from "./pages/Processos";
import Audiencias from "./pages/Audiencias";
import Tarefas from "./pages/Tarefas";
import Documentos from "./pages/Documentos";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import Mensagens from "./pages/Mensagens";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";

import Configuracoes from "./pages/Configuracoes";
import Agenda from "./pages/Agenda";
import Equipe from "./pages/Equipe";
import ConsultaProcessos from "./pages/ConsultaProcessos";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full">
                        <AppSidebar />
                        <main className="flex-1">
                          <div className="p-2 flex items-center justify-between">
                            <SidebarTrigger />
                            <ThemeToggle />
                          </div>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
                            <Route path="/clientes" element={<Clientes />} />
                            <Route path="/processos" element={<Processos />} />
                            <Route path="/audiencias" element={<Audiencias />} />
                            <Route path="/tarefas" element={<Tarefas />} />
                            <Route path="/documentos" element={<Documentos />} />
                            <Route path="/financeiro" element={<Financeiro />} />
                            <Route path="/agenda" element={<Agenda />} />
                            <Route path="/equipe" element={<Equipe />} />
                            <Route path="/consulta-processos" element={<ConsultaProcessos />} />
                            <Route path="/relatorios" element={<Relatorios />} />
                            <Route path="/mensagens" element={<Mensagens />} />
                            <Route path="/configuracoes" element={<Configuracoes />} />
                            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                      </div>
                    </SidebarProvider>
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

