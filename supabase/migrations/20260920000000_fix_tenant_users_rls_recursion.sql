-- Corrige recursão infinita na RLS de tenant_users.
--
-- A policy anterior consultava public.tenant_users de dentro da própria policy
-- de tenant_users. O Postgres reaplica a policy na subconsulta e aborta com
-- "infinite recursion detected in policy for relation tenant_users". Como todas
-- as outras policies (tenants, contacts, conversations) consultam tenant_users,
-- o erro se propagava: nenhuma leitura autenticada funcionava em tabela nenhuma.
--
-- A regra passa a ser o que o nome da policy já dizia: cada usuário lê o próprio
-- vínculo. Isso não recorre, e faz as demais policies terminarem normalmente.
drop policy if exists "tenant_users_can_read_own_membership" on public.tenant_users;

create policy "tenant_users_can_read_own_membership"
  on public.tenant_users for select to authenticated
  using (user_id = (select auth.uid()));
