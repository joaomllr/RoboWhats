import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ChatMessage, Contact, Tenant, BotConfig } from "../types";
import { botConfigRowToUi, botConfigUiToRow, BotConfigRow } from "./botConfig";
import { initialBotConfig } from "./demoData";

interface ConversationRow {
  id: string;
  contact_id: string;
  direction: "inbound" | "outbound";
  message_body: string | null;
  message_type: string;
  created_at: string;
}

export interface TenantData {
  tenant: Tenant | null;
  contacts: Contact[];
  messagesMap: Record<string, ChatMessage[]>;
  botConfig: BotConfig;
  saveBotConfig: (config: BotConfig) => Promise<{ error: string | null }>;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const isToday = new Date().toDateString() === date.toDateString();
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    ...(isToday ? {} : { day: "2-digit", month: "2-digit" }),
  });
}

function toChatMessage(row: ConversationRow): ChatMessage {
  return {
    id: row.id,
    contact_id: row.contact_id,
    direction: row.direction,
    message_body: row.message_body || "",
    message_type: row.message_type,
    sender: row.direction === "inbound" ? "contact" : "bot",
    text: row.message_body || "",
    timestamp: formatTime(row.created_at),
    created_at: row.created_at,
  };
}

/**
 * Carrega tenant, contatos e conversas reais do Postgres para o usuário logado.
 * A RLS já restringe tudo ao tenant do usuário, então nenhuma query filtra por
 * tenant_id manualmente — o banco é a fonte da verdade do isolamento.
 */
export function useTenantData(userId: string | null): TenantData {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [botConfig, setBotConfig] = useState<BotConfig>(initialBotConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);

    const { data: membership, error: membershipError } = await supabase
      .from("tenant_users")
      .select("tenant_id, tenants(id, name, plan_tier, status)")
      .maybeSingle();

    if (membershipError) {
      setError(membershipError.message);
      setLoading(false);
      return;
    }

    if (!membership?.tenants) {
      setError("Sua conta não está vinculada a nenhuma empresa.");
      setLoading(false);
      return;
    }

    const loadedTenant = membership.tenants as unknown as Tenant;
    setTenant(loadedTenant);

    const [contactsResult, conversationsResult, botConfigResult] = await Promise.all([
      supabase.from("contacts").select("*").order("updated_at", { ascending: false }),
      supabase.from("conversations").select("*").order("created_at", { ascending: true }),
      supabase.from("bot_configs").select("*").eq("tenant_id", loadedTenant.id).maybeSingle(),
    ]);

    if (botConfigResult.data) {
      setBotConfig(botConfigRowToUi(botConfigResult.data as BotConfigRow));
    }

    if (contactsResult.error || conversationsResult.error) {
      setError(contactsResult.error?.message || conversationsResult.error?.message || null);
      setLoading(false);
      return;
    }

    const grouped: Record<string, ChatMessage[]> = {};
    for (const row of (conversationsResult.data || []) as ConversationRow[]) {
      (grouped[row.contact_id] ||= []).push(toChatMessage(row));
    }

    setMessagesMap(grouped);
    setContacts(
      ((contactsResult.data || []) as Contact[]).map((contact) => {
        const history = grouped[contact.id] || [];
        const last = history[history.length - 1];
        return {
          ...contact,
          assignedAgent: contact.assignedAgent || "ai",
          lastMessageText: last?.text || "Sem mensagens ainda",
          lastMessageTime: last?.timestamp || "",
        };
      })
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
  }, [userId, load]);

  const saveBotConfig = useCallback(
    async (config: BotConfig): Promise<{ error: string | null }> => {
      if (!tenant) return { error: "Nenhum tenant carregado." };

      const row = botConfigUiToRow(tenant.id, config);
      const { error: upsertError } = await supabase
        .from("bot_configs")
        .upsert(row, { onConflict: "tenant_id" });

      if (upsertError) return { error: upsertError.message };

      setBotConfig(config);
      return { error: null };
    },
    [tenant]
  );

  // O bot grava as mensagens pela Edge Function, fora desta aba. Sem Realtime a
  // inbox só mudaria com refresh manual.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("inbox-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return { tenant, contacts, messagesMap, botConfig, saveBotConfig, loading, error, reload: load };
}
