export type TransactionType = 'boleto' | 'documento' | 'objeto'

export type TransactionStatus =
  // legacy (v1)
  | 'esperando_pago'
  | 'pendiente_entrega'
  | 'en_revision'
  | 'completado'
  | 'en_disputa'
  // v2 (escrow notarial)
  | 'borrador_lista'
  | 'negociando_lista'
  | 'lista_acordada'
  | 'pagada'
  | 'entregada'
  | 'en_edicion'
  | 'completada'
  | 'reembolsada'

export type ChecklistItem = {
  id: string
  text: string
}

export type DisputeAiVerdict = 'favor_buyer' | 'favor_seller'

export type Transaction = {
  id: string
  seller_id: string
  buyer_id: string | null
  amount: string
  type: TransactionType
  description: string | null
  status: TransactionStatus
  delivery_deadline: string | null
  delivered_at: string | null
  release_at: string | null
  created_at: string
  // v2 — checklist negociable
  checklist: ChecklistItem[]
  checklist_version: number
  checklist_last_proposed_by: 'seller' | 'buyer' | null
  // v2 — hitos
  paid_at: string | null
  delivery_uploaded_at: string | null
  resolved_at: string | null
  // v2 — disputa
  dispute_opened_at: string | null
  dispute_point_id: string | null
  dispute_buyer_comment: string | null
  dispute_seller_response: string | null
  dispute_ai_verdict: DisputeAiVerdict | null
  dispute_ai_reasoning: string | null
}

export type UserProfile = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  created_at: string
}

export type TransactionWithParties = Transaction & {
  seller: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null
  buyer: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null
}

export type FileKind = 'original' | 'watermarked'

export type TxFile = {
  id: string
  transaction_id: string
  version: number
  kind: FileKind | null
  storage_path: string | null
  uploaded_by: string | null
  url: string | null
  watermarked_url: string | null
  file_type: string | null
  created_at: string
}
