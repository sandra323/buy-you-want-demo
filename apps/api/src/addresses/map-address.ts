import type { Address as AddressDto } from '@lightbuy/shared';
import { Address } from './address.entity';

export function toAddressDto(row: Address): AddressDto {
  return {
    id: row.id,
    receiverName: row.receiverName,
    phone: row.phone,
    province: row.province,
    city: row.city,
    district: row.district,
    detail: row.detail,
    isDefault: row.isDefault,
  };
}
