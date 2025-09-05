-- Adicionar campo 'ativo' na tabela profiles para controlar status dos usuários
ALTER TABLE public.profiles 
ADD COLUMN ativo BOOLEAN DEFAULT true NOT NULL;

-- Criar índice para melhor performance
CREATE INDEX idx_profiles_ativo ON public.profiles(ativo);

-- Atualizar todos os usuários existentes como ativos
UPDATE public.profiles SET ativo = true WHERE ativo IS NULL;
