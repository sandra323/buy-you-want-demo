export interface Address {
  id: string;
  receiverName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export interface AddressInput {
  receiverName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

/** Immutable snapshot stored on orders. */
export interface ReceiverSnapshot {
  receiverName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
}
