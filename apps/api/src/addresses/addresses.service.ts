import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode, type Address as AddressDto } from '@lightbuy/shared';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AppException } from '../http/app.exception';
import { Address } from './address.entity';
import type { AddressInputDto } from './dto/address.dto';
import { toAddressDto } from './map-address';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addresses: Repository<Address>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async list(userId: string): Promise<AddressDto[]> {
    const rows = await this.addresses.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC', id: 'DESC' },
    });
    return rows.map(toAddressDto);
  }

  async create(userId: string, dto: AddressInputDto): Promise<AddressDto> {
    const saved = await this.dataSource.transaction(async (em) => {
      const rows = await this.lockUserAddresses(em, userId);
      const isFirst = rows.length === 0;
      const makeDefault = isFirst || dto.isDefault === true;

      if (makeDefault) {
        for (const row of rows) {
          if (row.isDefault) {
            row.isDefault = false;
            await em.save(row);
          }
        }
      }

      const created = em.create(Address, {
        userId,
        receiverName: dto.receiverName,
        phone: dto.phone,
        province: dto.province,
        city: dto.city,
        district: dto.district,
        detail: dto.detail,
        isDefault: makeDefault,
      });
      return em.save(created);
    });

    return toAddressDto(saved);
  }

  async update(
    userId: string,
    id: string,
    dto: AddressInputDto,
  ): Promise<AddressDto> {
    const saved = await this.dataSource.transaction(async (em) => {
      const rows = await this.lockUserAddresses(em, userId);
      const current = rows.find((row) => row.id === id);
      if (!current) {
        throw new AppException(ErrorCode.NOT_FOUND);
      }

      current.receiverName = dto.receiverName;
      current.phone = dto.phone;
      current.province = dto.province;
      current.city = dto.city;
      current.district = dto.district;
      current.detail = dto.detail;

      const wantDefault = dto.isDefault === true;
      if (wantDefault && !current.isDefault) {
        for (const row of rows) {
          row.isDefault = row.id === current.id;
          await em.save(row);
        }
      } else if (dto.isDefault === false && current.isDefault) {
        // 至少保留一个默认：若还有别的地址，把最近一条升上去。
        const others = rows.filter((row) => row.id !== current.id);
        if (others.length > 0) {
          current.isDefault = false;
          const promote = this.latestRow(others);
          promote.isDefault = true;
          await em.save(current);
          await em.save(promote);
        }
      } else {
        await em.save(current);
      }

      return em.findOneByOrFail(Address, { id: current.id });
    });

    return toAddressDto(saved);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    await this.dataSource.transaction(async (em) => {
      const rows = await this.lockUserAddresses(em, userId);
      const current = rows.find((row) => row.id === id);
      if (!current) {
        throw new AppException(ErrorCode.NOT_FOUND);
      }

      const wasDefault = Boolean(current.isDefault);
      await em.delete(Address, { id: current.id, userId });

      if (wasDefault) {
        const remaining = await this.lockUserAddresses(em, userId);
        if (remaining.length > 0) {
          const promote = this.latestRow(remaining);
          promote.isDefault = true;
          await em.save(promote);
        }
      }
    });

    return { ok: true };
  }

  /** 锁住该用户全部地址行，保证同一时刻最多一个 is_default。 */
  private lockUserAddresses(
    em: EntityManager,
    userId: string,
  ): Promise<Address[]> {
    return em
      .createQueryBuilder(Address, 'a')
      .setLock('pessimistic_write')
      .where('a.userId = :userId', { userId })
      .orderBy('a.id', 'ASC')
      .getMany();
  }

  private latestRow(rows: Address[]): Address {
    return [...rows].sort((a, b) => {
      const byTime = dateMs(b.createdAt) - dateMs(a.createdAt);
      if (byTime !== 0) {
        return byTime;
      }
      return b.id.localeCompare(a.id);
    })[0];
  }
}

function dateMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}
