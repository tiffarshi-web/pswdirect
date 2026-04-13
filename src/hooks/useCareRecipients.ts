import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { toast } from "sonner";

export interface CareRecipient {
  id: string;
  user_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  relationship: string | null;
  default_address: string | null;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  buzzer_code: string | null;
  entry_instructions: string | null;
  care_notes: string | null;
  mobility_notes: string | null;
  special_instructions: string | null;
  preferred_languages: string[] | null;
  preferred_gender: string | null;
  is_self: boolean;
  created_at: string;
  updated_at: string;
}

export type CareRecipientInput = Omit<CareRecipient, "id" | "user_id" | "created_at" | "updated_at">;

export const useCareRecipients = () => {
  const { user } = useSupabaseAuth();
  const [recipients, setRecipients] = useState<CareRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecipients = async () => {
    if (!user?.id) {
      setRecipients([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("care_recipients")
        .select("*")
        .eq("user_id", user.id)
        .order("is_self", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching care recipients:", error);
      } else {
        setRecipients((data as CareRecipient[]) || []);
      }
    } catch (err) {
      console.error("Error fetching recipients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchRecipients();
    else setIsLoading(false);
  }, [user?.id]);

  const addRecipient = async (input: CareRecipientInput) => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from("care_recipients")
      .insert({
        ...input,
        user_id: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error("Error adding recipient:", error);
      toast.error("Failed to save care recipient");
      return null;
    }

    setRecipients(prev => [...prev, data as CareRecipient]);
    return data as CareRecipient;
  };

  const updateRecipient = async (id: string, updates: Partial<CareRecipientInput>) => {
    const { data, error } = await supabase
      .from("care_recipients")
      .update(updates as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating recipient:", error);
      toast.error("Failed to update care recipient");
      return null;
    }

    setRecipients(prev => prev.map(r => r.id === id ? (data as CareRecipient) : r));
    return data as CareRecipient;
  };

  const deleteRecipient = async (id: string) => {
    const { error } = await supabase
      .from("care_recipients")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting recipient:", error);
      toast.error("Failed to delete care recipient");
      return false;
    }

    setRecipients(prev => prev.filter(r => r.id !== id));
    return true;
  };

  const selfRecipient = recipients.find(r => r.is_self);

  return {
    recipients,
    selfRecipient,
    isLoading,
    addRecipient,
    updateRecipient,
    deleteRecipient,
    refetch: fetchRecipients,
  };
};
