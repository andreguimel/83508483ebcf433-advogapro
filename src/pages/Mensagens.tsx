import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, MessageCircle, Send, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useToast } from "@/components/ui/use-toast";

type Template = {
  id: string;
  title: string;
  content: string;
  is_default?: boolean;
  user_id?: string | null;
};

type SupaCliente = {
  id: string;
  nome: string;
  telefone: string | null;
};

type SupaProcesso = {
  id: string;
  numero: string;
  assunto: string;
  status: string;
  cliente_id: string;
};

const Mensagens: React.FC = () => {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<SupaCliente[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [processos, setProcessos] = useState<SupaProcesso[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<SupaCliente | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [variableValues, setVariableValues] = useState<{
    [key: string]: string;
  }>({});

  const handleSelectCliente = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId) || null;
    setSelectedCliente(cliente);
    // Limpar processos quando trocar de cliente
    setProcessos([]);
    // Limpar valores de variáveis relacionadas a processo
    setVariableValues(prev => {
      const newValues = { ...prev };
      delete newValues.numero_processo;
      delete newValues.status_processo;
      return newValues;
    });
    // Buscar processos do cliente selecionado
    if (cliente) {
      fetchProcessosByCliente(cliente.id);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId) || null;
    setSelectedTemplate(template);
    setVariableValues({});
  };

  useEffect(() => {
    const fetchClientes = async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone")
        .order("nome", { ascending: true });
      if (error) {
        console.error("Erro ao carregar clientes:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de clientes.",
          variant: "destructive",
        });
        return;
      }
      setClientes((data || []) as SupaCliente[]);
    };
    fetchClientes();
  }, [toast]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("id, title, content")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Erro ao carregar modelos:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os modelos.",
          variant: "destructive",
        });
        return;
      }
      setTemplates((data || []) as Template[]);
    };
    fetchTemplates();
  }, [toast]);

  const fetchProcessosByCliente = async (clienteId: string) => {
    const { data, error } = await supabase
      .from("processos")
      .select("id, numero, assunto, status, cliente_id")
      .eq("cliente_id", clienteId)
      .order("numero", { ascending: true });
    
    if (error) {
      console.error("Erro ao carregar processos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os processos do cliente.",
        variant: "destructive",
      });
      return;
    }
    setProcessos((data || []) as SupaProcesso[]);
  };

  const variables = useMemo(() => {
    if (!selectedTemplate) return [];
    const matches = selectedTemplate.content.match(/\[(.*?)\]/g) || [];
    const uniqueMatches = [...new Set(matches)];
    return uniqueMatches.map((v) => v.slice(1, -1));
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedCliente && variables.includes("nome_cliente")) {
      setVariableValues((prev) => ({
        ...prev,
        nome_cliente: selectedCliente.nome,
      }));
    }
  }, [selectedCliente, variables]);

  const generatedMessage = useMemo(() => {
    if (!selectedTemplate) return "";
    let message = selectedTemplate.content;
    variables.forEach((key) => {
      const value = variableValues[key];
      message = message.replace(
        new RegExp(`\\[${key}\\]`, "g"),
        value || `[${key}]`
      );
    });
    return message;
  }, [selectedTemplate, variableValues, variables]);

  const handleVariableChange = (varName: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [varName]: value }));
  };

  const handleSendWhatsapp = () => {
    if (!selectedCliente) {
      toast({
        title: "Erro",
        description: "Selecione um cliente.",
        variant: "destructive",
      });
      return;
    }
    if (
      !generatedMessage ||
      variables.some((v) => generatedMessage.includes(`[${v}]`))
    ) {
      toast({
        title: "Erro",
        description: "Preencha todas as variáveis da mensagem.",
        variant: "destructive",
      });
      return;
    }

    const phone = (selectedCliente.telefone || "").replace(/\D/g, "");
    if (!phone) {
      toast({
        title: "Erro",
        description: "Cliente sem telefone válido.",
        variant: "destructive",
      });
      return;
    }
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(
      generatedMessage
    )}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mensagens</h1>
            <p className="text-gray-600 dark:text-gray-300">Envie mensagens personalizadas para seus clientes</p>
          </div>
        </div>

        {/* Seletores Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Select onValueChange={handleSelectCliente}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={String(cliente.id)}>
                    {cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Select
              onValueChange={handleSelectTemplate}
              disabled={!selectedCliente}
            >
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Selecione um modelo de mensagem" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={String(template.id)}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {selectedTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/50 rounded">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg">Variáveis</CardTitle>
                </div>
                <CardDescription>
                  Preencha os campos para personalizar a mensagem.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {variables.length > 0 ? (
                  variables.map((varName) => {
                    // Campo especial para número do processo
                    if (varName === "numero_processo") {
                      return (
                        <div key={varName} className="space-y-2">
                          <Label htmlFor={varName} className="text-sm font-medium">
                            Número do Processo
                          </Label>
                          <Select
                            value={variableValues[varName] || ""}
                            onValueChange={(value) => handleVariableChange(varName, value)}
                            disabled={!selectedCliente || processos.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um processo" />
                            </SelectTrigger>
                            <SelectContent>
                              {processos.map((processo) => (
                                <SelectItem key={processo.id} value={processo.numero}>
                                  {processo.numero} - {processo.assunto}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }
                    
                    // Campo especial para status do processo
                    if (varName === "status_processo") {
                      return (
                        <div key={varName} className="space-y-2">
                          <Label htmlFor={varName} className="text-sm font-medium">
                            Status do Processo
                          </Label>
                          <Select
                            value={variableValues[varName] || ""}
                            onValueChange={(value) => handleVariableChange(varName, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                              <SelectItem value="Aguardando">Aguardando</SelectItem>
                              <SelectItem value="Concluído">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }
                    
                    // Campos especiais para datas
                    if (varName === "data_audiencia" || varName === "data_vencimento") {
                      const labelText = varName === "data_audiencia" ? "Data da Audiência" : "Data de Vencimento";
                      return (
                        <div key={varName} className="space-y-2">
                          <Label htmlFor={varName} className="text-sm font-medium">
                            {labelText}
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !variableValues[varName] && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {variableValues[varName] ? (
                                  variableValues[varName]
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={variableValues[varName] ? new Date(variableValues[varName]) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    handleVariableChange(varName, format(date, "dd/MM/yyyy", { locale: ptBR }));
                                  }
                                }}
                                locale={ptBR}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      );
                    }
                    
                    // Campos normais de input
                    return (
                      <div key={varName} className="space-y-2">
                        <Label htmlFor={varName} className="text-sm font-medium capitalize">
                          {varName.replace(/_/g, " ")}
                        </Label>
                        <Input
                          id={varName}
                          value={variableValues[varName] || ""}
                          onChange={(e) =>
                            handleVariableChange(varName, e.target.value)
                          }
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Este modelo não possui variáveis.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-green-100 dark:bg-green-900/50 rounded">
                    <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-lg">Pré-visualização</CardTitle>
                </div>
                <CardDescription>
                  Esta é a mensagem que será enviada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  readOnly
                  value={generatedMessage}
                  className="h-48 resize-none bg-gray-50 dark:bg-gray-900/50"
                  placeholder="A pré-visualização da mensagem aparecerá aqui..."
                />
                <Button 
                  onClick={handleSendWhatsapp} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Send className="mr-2 h-4 w-4" /> 
                  Enviar via WhatsApp
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        
        {!selectedTemplate && (
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Selecione um cliente e template
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                Escolha um cliente e um modelo de mensagem para começar a personalizar sua comunicação.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Mensagens;
