-- Criar política para permitir que o administrador veja todos os perfis
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' = 'andreguimel@gmail.com'
  OR auth.uid() = id
);

-- Criar política para permitir que o administrador delete qualquer perfil
CREATE POLICY "Admin can delete any profile" 
ON public.profiles 
FOR DELETE 
USING (
  auth.jwt() ->> 'email' = 'andreguimel@gmail.com'
  AND auth.jwt() ->> 'email' != (SELECT email FROM public.profiles WHERE id = public.profiles.id)
);

-- Atualizar a política de visualização existente para incluir admin
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile or admin can view all" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR auth.jwt() ->> 'email' = 'andreguimel@gmail.com'
);
