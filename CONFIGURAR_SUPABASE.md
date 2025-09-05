# ⚠️ URGENTE - Configuração Necessária no Supabase

Para que todos os usuários apareçam na lista de gerenciamento, você precisa executar estes comandos SQL no painel do Supabase.

## 🔧 **PASSO A PASSO:**

### 1. Acesse o Painel do Supabase:
- Vá para: https://supabase.com/dashboard
- Faça login na sua conta
- Selecione o projeto "Advogapro"
- Clique na aba **"SQL Editor"** (no menu lateral esquerdo)

### 2. Cole e Execute este SQL:

```sql
-- =============================================
-- SCRIPT COMPLETO PARA SISTEMA DE USUÁRIOS
-- =============================================

-- 1. PRIMEIRO: Verificar se a coluna 'ativo' já existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'ativo';

-- 2. Adicionar campo 'ativo' na tabela profiles (só se não existir)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'ativo'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN ativo BOOLEAN DEFAULT true NOT NULL;
    END IF;
END $$;

-- 3. Criar índice para melhor performance (só se não existir)
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);

-- 4. Atualizar todos os usuários existentes como ativos
UPDATE public.profiles SET ativo = true WHERE ativo IS NULL OR ativo IS NOT DISTINCT FROM NULL;

-- 5. Remover todas as políticas antigas da tabela profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile or admin can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete any profile except own" ON public.profiles;
DROP POLICY IF EXISTS "admin_view_all_or_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "allow_profile_creation" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_all_or_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_delete_others" ON public.profiles;

-- 6. Criar políticas que funcionam corretamente
-- Política para VISUALIZAR: Admin vê todos, usuários veem apenas o próprio
CREATE POLICY "admin_view_all_or_own_profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR (auth.jwt() ->> 'email') = 'andreguimel@gmail.com'
);

-- Política para INSERIR: Permitir criação de novos perfis
CREATE POLICY "allow_profile_creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id 
  OR (auth.jwt() ->> 'email') = 'andreguimel@gmail.com'
);

-- Política para ATUALIZAR: Admin pode atualizar todos, usuários só o próprio
CREATE POLICY "admin_update_all_or_own_profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id 
  OR (auth.jwt() ->> 'email') = 'andreguimel@gmail.com'
);

-- Política para DELETAR: Apenas admin pode deletar (exceto ele mesmo)
CREATE POLICY "admin_delete_others" 
ON public.profiles 
FOR DELETE 
USING (
  (auth.jwt() ->> 'email') = 'andreguimel@gmail.com'
  AND email != 'andreguimel@gmail.com'
);

-- 7. Verificar se RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. VERIFICAÇÃO FINAL: Mostrar estrutura da tabela e dados
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 9. Verificar quantos usuários existem com o novo campo
SELECT 
  id,
  email,
  full_name,
  ativo,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
```

### 3. ⚠️ **IMPORTANTE - Configure a Autenticação:**

**OBRIGATÓRIO** para que os usuários sejam criados sem precisar confirmar email:

1. Acesse: https://supabase.com/dashboard/project/wtyvklvkajswsshnziri/auth/settings
2. Na seção **"User Signups"**:
   - ✅ **DESMARQUE** a opção **"Enable email confirmations"**
   - ✅ **MARQUE** a opção **"Enable manual user signups"** (se disponível)
3. **Clique em "Save"**
4. **REINICIE** o servidor de desenvolvimento (npm run dev)

**⚠️ SEM ESTA CONFIGURAÇÃO:** Os usuários criados ficarão pendentes de confirmação de email!

### 4. Teste o Sistema:

1. Volte para o sistema: http://localhost:8081/
2. Faça logout e login novamente com `andreguimel@gmail.com`
3. Vá em "Administração" → "Gerenciar Usuários"
4. Agora você deve ver todos os usuários
5. Tente criar um novo usuário para testar

### 5. Para Alterar Senhas dos Usuários:

**ATUALIZADO:** O sistema agora permite alterar senhas diretamente através da interface!

1. **Clique no botão "Alterar Senha"** (azul) ao lado do usuário desejado
2. **Digite a nova senha** (mínimo 6 caracteres) 
3. **Clique em "Alterar Senha"** para confirmar
4. **A senha será alterada** automaticamente no sistema

**Configuração Necessária para Funcionar:**

Para que a alteração de senhas funcione, você precisa configurar a **Service Role Key** no projeto:

1. **Acesse:** https://supabase.com/dashboard/project/wtyvklvkajswsshnziri/settings/api
2. **Copie a "service_role" key** (não a "anon" key)
3. **Substitua no arquivo de configuração** do Supabase no projeto
4. **Reinicie o servidor** de desenvolvimento

**Alternativa Manual (se não configurar a Service Role):**
- Acesse: https://supabase.com/dashboard/project/wtyvklvkajswsshnziri/auth/users
- Encontre o usuário na lista
- Clique nos 3 pontos (⋯) → "Reset Password"
- Informe a nova senha temporária

## 🚨 **Se ainda não funcionar:**

### Problema: Erro 400 ao tentar desativar usuário

Se você receber erro `Failed to load resource: the server responded with a status of 400`, significa que a coluna `ativo` ainda não foi criada. 

**Solução:**

Execute este comando específico no SQL Editor:

```sql
-- VERIFICAR se a coluna existe
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'ativo';

-- Se não retornar nada, execute:
ALTER TABLE public.profiles ADD COLUMN ativo BOOLEAN DEFAULT true NOT NULL;

-- Depois, atualize todos os registros:
UPDATE public.profiles SET ativo = true;

-- Teste se funcionou:
SELECT id, email, ativo FROM public.profiles LIMIT 5;
```

### Se NADA funcionar (Política de Emergência):

```sql
-- Política mais permissiva para teste (TEMPORÁRIA)
DROP POLICY IF EXISTS "admin_view_all_or_own_profile" ON public.profiles;

CREATE POLICY "emergency_policy" 
ON public.profiles 
FOR ALL
USING (true)
WITH CHECK (true);
```

⚠️ **ATENÇÃO:** Esta última política é muito permissiva e deve ser usada apenas para teste!

### Verificação de Debug:

Abra o console do navegador (F12) e:
1. Tente desativar um usuário
2. Veja as mensagens de debug que começam com 🔄, 📊, 📝
3. Se aparecer "Configuração Necessária", execute o SQL acima
