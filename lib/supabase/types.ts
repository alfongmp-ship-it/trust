export type TransactionType = 'boleto' | 'documento' | 'objeto'

export type TransactionStatus =
  | 'esperando_pago'
  | 'pendiente_entrega'
  | 'en_revision'
  | 'completado'
  | 'en_disputa'

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
