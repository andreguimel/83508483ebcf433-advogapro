import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Plus, Mail, Shield, Trash2, Eye, EyeOff, UserCheck, UserX, Power, Ban, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Usuario {
  id: string;
  email?: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
  ativo?: boolean;
}

const GerenciarUsuarios = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [senhaDialogOpen, setSenhaDialogOpen] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [novoUsuario, setNovoUsuario] = useState({
    email: '',
    senha: '',
    nome: ''
  });
  const [novaSenha, setNovaSenha] = useState('');

  // Verificar se o usuário atual é administrador
  const isAdmin = user?.email === 'andreguimel@gmail.com';

  useEffect(() => {
    if (isAdmin) {
      carregarUsuarios();
    }
  }, [isAdmin]);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      console.log('🔍 Carregando usuários da tabela profiles...');
      console.log('👤 Usuário atual:', user?.email, 'ID:', user?.id);
      
      // Primeiro, verificar se há dados na tabela
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      console.log('📊 Total de registros na tabela profiles:', count, 'Erro:', countError);
      
      // Buscar usuários da tabela profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📋 Resultado da consulta completa:');
      console.log('- Dados recebidos:', data);
      console.log('- Erro:', error);
      console.log('- Quantidade de usuários carregados:', data?.length || 0);
      
      if (error) {
        console.error('❌ Erro ao carregar usuários:', error);
        console.log('🔧 Código do erro:', error.code);
        console.log('📝 Mensagem do erro:', error.message);
        console.log('🔧 Detalhes:', error.details);
        
        // Se houver erro de permissão/RLS
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('RLS') || error.code === '42501') {
          console.log('🚨 ERRO DE RLS DETECTADO! As políticas não estão configuradas corretamente.');
          
          // Mostrar apenas o usuário admin atual como fallback
          const adminUser = {
            id: user?.id || 'temp-admin',
            email: user?.email || 'andreguimel@gmail.com',
            full_name: 'Administrador',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          setUsuarios([adminUser]);
          
          toast({
            title: '⚠️ Configuração Necessária',
            description: 'As políticas RLS precisam ser configuradas no Supabase. Veja o arquivo CONFIGURAR_SUPABASE.md',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Erro',
            description: `Erro ao carregar usuários: ${error.message}`,
            variant: 'destructive',
          });
        }
        return;
      }

      // Se chegou aqui, não houve erro
      console.log('✅ Usuários carregados com sucesso:', data?.length || 0);
      
      if (data && data.length === 0) {
        console.log('⚠️ Nenhum usuário encontrado na tabela profiles');
        toast({
          title: 'Aviso',
          description: 'Nenhum usuário encontrado. Tente criar um usuário primeiro.',
          variant: 'default',
        });
      }
      
      setUsuarios(data || []);
    } catch (error) {
      console.error('💥 Erro inesperado:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar usuários.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const criarUsuario = async () => {
    if (!novoUsuario.email || !novoUsuario.senha || !novoUsuario.nome) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Criar o usuário usando signup normal
      const { data, error } = await supabase.auth.signUp({
        email: novoUsuario.email,
        password: novoUsuario.senha,
        options: {
          data: {
            full_name: novoUsuario.nome
          }
        }
      });

      if (error) {
        console.error('Erro ao criar usuário:', error);
        toast({
          title: 'Erro',
          description: error.message || 'Não foi possível criar o usuário.',
          variant: 'destructive',
        });
        return;
      }

      // O trigger automático criará o registro na tabela profiles
      if (data.user) {
        console.log('Usuário criado com sucesso:', data.user);
        
        // Aguardar um momento para o trigger processar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar se o perfil foi criado, se não, criar manualmente
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();
        
        if (!profileCheck) {
          console.log('Perfil não encontrado, criando manualmente...');
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: novoUsuario.nome,
            });
          
          if (profileError) {
            console.error('Erro ao criar perfil:', profileError);
          } else {
            console.log('Perfil criado manualmente com sucesso');
          }
        }
        
        toast({
          title: 'Sucesso',
          description: `Usuário ${novoUsuario.nome} foi criado com sucesso!`,
        });
      }

      setNovoUsuario({ email: '', senha: '', nome: '' });
      setDialogOpen(false);
      
      // Recarregar a lista após criar
      await carregarUsuarios();
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao criar usuário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const excluirUsuario = async (userId: string) => {
    setLoading(true);
    try {
      // Excluir apenas da tabela profiles (o usuário ainda existirá em auth.users)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Erro ao excluir usuário:', error);
        toast({
          title: 'Erro',
          description: error.message || 'Não foi possível excluir o usuário.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário removido da lista com sucesso!',
      });

      carregarUsuarios();
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao excluir usuário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const alternarStatusUsuario = async (userId: string, ativoAtual: boolean) => {
    setLoading(true);
    try {
      const novoStatus = !ativoAtual;
      
      console.log('🔄 Alterando status do usuário:');
      console.log('- ID do usuário:', userId);
      console.log('- Status atual:', ativoAtual);
      console.log('- Novo status:', novoStatus);
      
      // Verificar se a coluna ativo existe na tabela
      const { data: tableInfo, error: tableError } = await supabase
        .from('profiles')
        .select('ativo')
        .eq('id', userId)
        .single();
      
      console.log('📊 Verificação da tabela:', { tableInfo, tableError });
      
      if (tableError && tableError.code === 'PGRST116') {
        // Coluna ativo não existe ainda
        toast({
          title: 'Configuração Necessária',
          description: 'A coluna "ativo" não existe. Execute o SQL do arquivo CONFIGURAR_SUPABASE.md',
          variant: 'default',
        });
        return;
      }
      
      // Usar any temporariamente até os tipos serem atualizados
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: novoStatus } as any)
        .eq('id', userId);

      console.log('📝 Resultado da atualização:', { error });

      if (error) {
        console.error('❌ Erro ao alterar status do usuário:', error);
        console.log('🔧 Código do erro:', error.code);
        console.log('📝 Mensagem do erro:', error.message);
        console.log('🔧 Detalhes:', error.details);
        
        toast({
          title: 'Erro',
          description: error.message || 'Não foi possível alterar o status do usuário.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sucesso',
        description: `Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`,
      });

      carregarUsuarios();
    } catch (error) {
      console.error('💥 Erro inesperado:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao alterar status do usuário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const alterarSenhaUsuario = async () => {
    if (!usuarioSelecionado || !novaSenha.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe uma nova senha válida.',
        variant: 'destructive',
      });
      return;
    }

    if (novaSenha.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🔑 Alterando senha para:', usuarioSelecionado.email);
      
      // Tentar alterar a senha usando a API admin do Supabase
      const { data, error } = await supabase.auth.admin.updateUserById(
        usuarioSelecionado.id,
        { password: novaSenha }
      );

      if (error) {
        console.error('❌ Erro na API admin:', error);
        throw new Error('Não foi possível alterar a senha. Este recurso requer configuração adicional no Supabase.');
      }

      console.log('✅ Senha alterada com sucesso:', data);

      toast({
        title: '✅ Senha Alterada',
        description: `A senha de ${usuarioSelecionado.email} foi alterada com sucesso.`,
        variant: 'default',
      });

      // Fechar o dialog e limpar campos
      setSenhaDialogOpen(false);
      setUsuarioSelecionado(null);
      setNovaSenha('');

    } catch (error: any) {
      console.error('💥 Erro inesperado:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro inesperado ao alterar a senha.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogSenha = (usuario: Usuario) => {
    setUsuarioSelecionado(usuario);
    setNovaSenha('');
    setSenhaDialogOpen(true);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar usuários baseado no status selecionado
  const usuariosFiltrados = usuarios.filter(usuario => {
    if (filtroStatus === 'todos') return true;
    if (filtroStatus === 'ativos') return usuario.ativo !== false;
    if (filtroStatus === 'inativos') return usuario.ativo === false;
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Acesso Negado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Apenas administradores podem acessar esta página.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Usuários</h1>
              <p className="text-gray-600 dark:text-gray-300">Administre os usuários do sistema</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={carregarUsuarios}
              variant="outline"
              className="text-sm"
              disabled={loading}
            >
              🔄 Recarregar
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Adicione um novo usuário ao sistema. O usuário será criado já ativo e poderá fazer login imediatamente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={novoUsuario.nome}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                    placeholder="Nome completo do usuário"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={novoUsuario.email}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha Temporária</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={novoUsuario.senha}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={criarUsuario} disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>

            {/* Dialog para Alterar Senha */}
            <Dialog open={senhaDialogOpen} onOpenChange={setSenhaDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Senha do Usuário</DialogTitle>
                  <DialogDescription>
                    Defina uma nova senha para <strong>{usuarioSelecionado?.email}</strong>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nova-senha">Nova Senha</Label>
                    <Input
                      id="nova-senha"
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Digite a nova senha (mín. 6 caracteres)"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSenhaDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={alterarSenhaUsuario}
                    disabled={loading || !novaSenha.trim() || novaSenha.length < 6}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Processando...' : 'Alterar Senha'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-4">
          <Label htmlFor="filtro-status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtrar por status:
          </Label>
          <Select value={filtroStatus} onValueChange={(value: any) => setFiltroStatus(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione um status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os usuários</SelectItem>
              <SelectItem value="ativos">Usuários ativos</SelectItem>
              <SelectItem value="inativos">Usuários desativados</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {usuariosFiltrados.length} de {usuarios.length} usuários
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 pt-0">
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>
              {usuarios.length} usuário(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading && usuarios.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Carregando usuários...</p>
                </div>
              ) : usuariosFiltrados.length === 0 && usuarios.length > 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum usuário encontrado com o filtro selecionado</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => setFiltroStatus('todos')}
                  >
                    Limpar filtro
                  </Button>
                </div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum usuário encontrado</p>
                </div>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <Card key={usuario.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{usuario.email || 'Email não informado'}</span>
                            {usuario.email === 'andreguimel@gmail.com' && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            <Badge variant={usuario.ativo !== false ? "default" : "destructive"}>
                              {usuario.ativo !== false ? (
                                <>
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Ativo
                                </>
                              ) : (
                                <>
                                  <Ban className="h-3 w-3 mr-1" />
                                  Desativado
                                </>
                              )}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            {usuario.full_name && (
                              <p><span className="font-medium">Nome:</span> {usuario.full_name}</p>
                            )}
                            <p><span className="font-medium">Criado em:</span> {formatarData(usuario.created_at)}</p>
                            <p><span className="font-medium">Atualizado em:</span> {formatarData(usuario.updated_at)}</p>
                          </div>
                        </div>
                        
                        {usuario.email !== 'andreguimel@gmail.com' && (
                          <div className="flex flex-col gap-2">
                            {/* Botão de Ativar/Desativar */}
                            <Button 
                              onClick={() => alternarStatusUsuario(usuario.id, usuario.ativo !== false)}
                              variant={usuario.ativo !== false ? "outline" : "default"}
                              size="sm"
                              disabled={loading}
                            >
                              {usuario.ativo !== false ? (
                                <>
                                  <Ban className="h-4 w-4 mr-1" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 mr-1" />
                                  Ativar
                                </>
                              )}
                            </Button>
                            
                            {/* Botão de Alterar Senha */}
                            <Button 
                              onClick={() => abrirDialogSenha(usuario)}
                              variant="secondary"
                              size="sm"
                              disabled={loading}
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Alterar Senha
                            </Button>
                            
                            {/* Botão de Excluir */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Excluir
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o usuário <strong>{usuario.email || 'usuário'}</strong>? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => excluirUsuario(usuario.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GerenciarUsuarios;
