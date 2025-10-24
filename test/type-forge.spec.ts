import { TypeForge, TypeNotRegisteredError, TypeRegistry } from '../src';
import { TypeInspector } from '../src/lib/type-inspector';

import { UserDTO } from './fixtures/user.dto';
import { AddressDTO } from './fixtures/address.dto';
import { OrderDTO } from './fixtures/order.dto';
import { PageableDTO } from './fixtures/pageable.dto';
import { UserStatus } from './fixtures/enums';

describe('TypeForge', () => {
  let registry: TypeRegistry;
  let forge: TypeForge;

  beforeAll(() => {
    // Aponta o Inspector para o tsconfig de TESTE - ESSENCIAL
    const testInspector = TypeInspector.getInstance('./test/tsconfig.json');

    registry = new TypeRegistry();

    // Registra TODOS os DTOs de fixture
    registry.register(AddressDTO);
    registry.register(OrderDTO);
    registry.register(UserDTO, {
      // UserDTO tem allowedValues
      allowedValues: {
        status: Object.values(UserStatus),
      },
    });
    registry.register(PageableDTO); // DTO Genérico

    // Cria a forge injetando o registro e o inspector de teste
    forge = new TypeForge(registry, testInspector);
  });

  // --- Testes de Criação Básica ---

  it('should create a simple DTO with correct primitive types', () => {
    const address = forge.create(AddressDTO);

    expect(address).toBeDefined();
    expect(typeof address.street).toBe('string');
    expect(address.street.length).toBeGreaterThan(0);
    expect(typeof address.city).toBe('string');
    expect(address.city.length).toBeGreaterThan(0);
    expect(typeof address.zipCode).toBe('string');
    expect(address.zipCode.length).toBeGreaterThan(0);
  });

  it('should create a complex DTO with various types', () => {
    const user = forge.create(UserDTO);

    expect(user).toBeDefined();
    // Primitivos e Heurísticas de Nome
    expect(typeof user.id).toBe('string');
    expect(typeof user.firstName).toBe('string');
    expect(typeof user.lastName).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.age).toBe('number');
    expect(typeof user.isActive).toBe('boolean');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(Object.values(UserStatus)).toContain(user.status);
  });

  // --- Testes de Aninhamento Automático ---

  it('should automatically create nested objects', () => {
    const user = forge.create(UserDTO);
    expect(user.address).toBeDefined();
    expect(user.address).toBeInstanceOf(AddressDTO); // Verifica o tipo real
    expect(typeof user.address.street).toBe('string');
    expect(typeof user.address.city).toBe('string');
  });

  it('should automatically create nested arrays with default count of 1', () => {
    const user = forge.create(UserDTO);
    expect(user.orders).toBeInstanceOf(Array);
    expect(user.orders.length).toBe(1);
    expect(user.orders[0]).toBeInstanceOf(OrderDTO); // Verifica o tipo real
    expect(typeof user.orders[0].orderId).toBe('string');
    expect(typeof user.orders[0].productName).toBe('string');
    expect(typeof user.orders[0].quantity).toBe('number');
    expect(user.orders[0].orderDate).toBeInstanceOf(Date);
  });

  it('should automatically create arrays of primitives with default count of 1', () => {
    const user = forge.create(UserDTO);
    expect(user.tags).toBeInstanceOf(Array);
    expect(user.tags.length).toBe(1);
    expect(typeof user.tags[0]).toBe('string');
  });

  it('should automatically create arrays of Dates with default count of 1', () => {
    const user = forge.create(UserDTO);
    expect(user.loginDates).toBeInstanceOf(Array);
    expect(user.loginDates.length).toBe(1);
    expect(user.loginDates[0]).toBeInstanceOf(Date);
  });

  // --- Testes de Opções de Criação ---

  it('should apply overrides correctly', () => {
    const specificDate = new Date('2025-10-24T10:00:00.000Z');
    const user = forge.create(UserDTO, {
      overrides: {
        firstName: 'Kelvin',
        age: 99,
        isActive: true,
        status: UserStatus.ACTIVE,
        address: { street: 'Rua Teste', city: 'Override City', zipCode: '123' },
        orders: [],
        tags: ['tag1', 'tag2'],
        createdAt: specificDate,
      },
    });

    expect(user.firstName).toBe('Kelvin');
    expect(user.age).toBe(99);
    expect(user.isActive).toBe(true);
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.address.city).toBe('Override City');
    expect(user.orders.length).toBe(0);
    expect(user.tags).toEqual(['tag1', 'tag2']);
    expect(user.createdAt).toEqual(specificDate);
  });

  it('should use arrayCounts to set specific array lengths', () => {
    const user = forge.create(UserDTO, {
      arrayCounts: {
        orders: 3,
        tags: 5,
        loginDates: 2,
      },
    });

    expect(user.orders.length).toBe(3);
    expect(user.tags.length).toBe(5);
    expect(user.loginDates.length).toBe(2);
    expect(user.orders[0]).toBeInstanceOf(OrderDTO);
    expect(typeof user.tags[0]).toBe('string');
    expect(user.loginDates[0]).toBeInstanceOf(Date);
  });

  it('should use emptyArrays to force arrays to be empty', () => {
    const user = forge.create(UserDTO, {
      emptyArrays: ['orders', 'tags'],
    });

    expect(user.orders.length).toBe(0);
    expect(user.tags.length).toBe(0);
    // loginDates não foi especificado, deve ter 1 (padrão)
    expect(user.loginDates.length).toBe(1);
  });

  it('should handle overrides in combination with arrayCounts/emptyArrays (overrides win)', () => {
    const user = forge.create(UserDTO, {
      arrayCounts: { orders: 5 },
      emptyArrays: ['tags'],
      overrides: {
        orders: [
          {
            orderId: 'forced-1',
            productName: 'A',
            quantity: 1,
            orderDate: new Date(),
          },
        ], // Override vence arrayCounts
        tags: ['forced-tag'], // Override vence emptyArrays
      },
    });

    expect(user.orders.length).toBe(1);
    expect(user.orders[0].orderId).toBe('forced-1');
    expect(user.tags).toEqual(['forced-tag']);
  });

  // --- Testes de Genéricos ---

  it('should create generic DTOs correctly', () => {
    const userPage = forge.create<PageableDTO<UserDTO>>(PageableDTO, {
      overrides: { page: 1, limit: 10, total: 25 },
      generics: {
        results: {
          // 'results' é a propriedade T[]
          type: UserDTO, // T deve ser UserDTO
          count: 5, // Crie 5 UserDTOs
        },
      },
    });

    expect(userPage.page).toBe(1);
    expect(userPage.limit).toBe(10);
    expect(userPage.total).toBe(25);
    expect(userPage.results).toBeInstanceOf(Array);
    expect(userPage.results.length).toBe(5);
    expect(userPage.results[0]).toBeInstanceOf(UserDTO);
    expect(typeof userPage.results[0].id).toBe('string');
    expect(userPage.results[0].address).toBeInstanceOf(AddressDTO); // Verifica aninhamento dentro do genérico
  });

  it('should allow options within generics', () => {
    const userPage = forge.create<PageableDTO<UserDTO>>(PageableDTO, {
      generics: {
        results: {
          type: UserDTO,
          count: 2,
          options: (index) => ({
            // Opções específicas para cada UserDTO no array
            overrides: {
              firstName: `User ${index}`,
            },
            arrayCounts: {
              orders: index + 1, // User 0 tem 1 ordem, User 1 tem 2 ordens
            },
          }),
        },
      },
    });

    expect(userPage.results.length).toBe(2);
    expect(userPage.results[0].firstName).toBe('User 0');
    expect(userPage.results[1].firstName).toBe('User 1');
    expect(userPage.results[0].orders.length).toBe(1);
    expect(userPage.results[1].orders.length).toBe(2);
  });

  // --- Testes de createMany ---

  it('should create multiple instances using createMany', () => {
    const users = forge.createMany(3, UserDTO);
    expect(users).toBeInstanceOf(Array);
    expect(users.length).toBe(3);
    expect(users[0]).toBeInstanceOf(UserDTO);
    expect(users[1]).toBeInstanceOf(UserDTO);
    expect(users[2]).toBeInstanceOf(UserDTO);
  });

  it('should apply overrides object to all instances in createMany', () => {
    const users = forge.createMany(2, UserDTO, {
      overrides: { isActive: false },
    });
    expect(users[0].isActive).toBe(false);
    expect(users[1].isActive).toBe(false);
  });

  it('should apply overrides function to each instance in createMany', () => {
    const users = forge.createMany(3, UserDTO, (index: number) => ({
      overrides: {
        age: 20 + index,
      },
    }));

    expect(users[0].age).toBe(20);
    expect(users[1].age).toBe(21);
    expect(users[2].age).toBe(22);
  });

  // --- Teste de Erro ---

  it('should throw TypeNotRegisteredError if a nested DTO is not registered', () => {
    // Cria um registro VAZIO
    const emptyRegistry = new TypeRegistry();
    const badForge = new TypeForge(
      emptyRegistry,
      TypeInspector.getInstance('./test/tsconfig.json'),
    );

    // Tentar criar UserDTO deve falhar, pois AddressDTO não está registrado
    expect(() => badForge.create(UserDTO)).toThrow(TypeNotRegisteredError);

    // Verifica a mensagem de erro específica
    try {
      badForge.create(UserDTO);
    } catch (e) {
      expect(e).toBeInstanceOf(TypeNotRegisteredError);
      expect((e as Error).message).toContain('Classe aninhada "AddressDTO"');
      expect((e as Error).message).toContain('para a propriedade "address"');
      expect((e as Error).message).toContain('registry.register(AddressDTO)');
    }

    // Registra SÓ AddressDTO, agora deve falhar em OrderDTO
    emptyRegistry.register(AddressDTO);
    expect(() => badForge.create(UserDTO)).toThrow(TypeNotRegisteredError);
    try {
      badForge.create(UserDTO);
    } catch (e) {
      expect(e).toBeInstanceOf(TypeNotRegisteredError);
      expect((e as Error).message).toContain('Classe aninhada "OrderDTO"');
      expect((e as Error).message).toContain('para o array "orders"');
      expect((e as Error).message).toContain('registry.register(OrderDTO)');
    }
  });
});
