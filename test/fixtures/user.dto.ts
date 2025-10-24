import { AddressDTO } from './address.dto';
import { OrderDTO } from './order.dto';
import { UserStatus } from './enums';

/** DTO complexo para testes, cobrindo vários cenários */
export class UserDTO {
  /** Teste de UUID/ID */
  id!: string;

  /** Teste de nome */
  firstName!: string;
  lastName!: string;

  /** Teste de email */
  email!: string;

  /** Teste de número */
  age!: number;

  /** Teste de booleano */
  isActive!: boolean;

  /** Teste de Data */
  createdAt!: Date;

  /** Teste de Enum */
  status!: UserStatus;

  /** Teste de objeto aninhado */
  address!: AddressDTO;

  /** Teste de array aninhado */
  orders!: OrderDTO[];

  /** Teste de array de primitivos */
  tags!: string[];

  /** Teste de array de Datas */
  loginDates!: Date[];
}
