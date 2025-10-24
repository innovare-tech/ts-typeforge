# @innv/ts-typeforge

[![NPM Version](https://img.shields.io/npm/v/@innv/ts-typeforge.svg)](https://www.npmjs.com/package/@innv/ts-typeforge)
[![CI Status](https://img.shields.io/github/actions/workflow/status/innovare-tech/ts-typeforge/ci.yml?branch=main)](https://github.com/innovare-tech/ts-typeforge/actions/workflows/ci.yml)
[![Test Coverage](https://img.shields.io/codecov/c/github/innovare-tech/ts-typeforge.svg)](https://codecov.io/gh/innovare-tech/ts-typeforge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Crie mocks de DTOs e tipos complexos em TypeScript sem esforço. `ts-typeforge` lê seus tipos estaticamente e usa o Faker.js para gerar dados realistas e com tipagem correta.

Cansado de escrever manualmente mocks para seus testes unitários e e2e?

```typescript
// O jeito difícil...
const mockUser = {
    id: 'uuid-aleatorio',
    name: 'João Silva',
    email: 'joao@email.com',
    age: 30,
    orders: [
        { sku: 'SKU-123', quantity: 2 },
    ]
};
```

`ts-typeforge` automatiza isso.

## Features

* **Zero Configuração Aninhada:** Cria automaticamente DTOs aninhados (ex: `UserDTO` tem `OrdersDTO[]`) sem configuração manual.
* **Inferência Inteligente do Faker:** Usa nomes de propriedades (ex: `email`, `uuid`, `firstName`) para escolher o gerador correto do Faker.
* **Suporte a Genéricos:** Lida facilmente com tipos como `PageableDTO<UserDTO>`.
* **Totalmente Configurável:** Permite `overrides`, contagem de arrays (`arrayCounts`), arrays vazios (`emptyArrays`) e `allowedValues` (enums).
* **Seguro para o Desenvolvedor:** Lança erros claros se você esquecer de registrar um DTO aninhado.

## Instalação

`ts-typeforge` requer `ts-morph`, `@faker-js/faker` e `reflect-metadata` como `peerDependencies`.

```bash
npm install @innv/ts-typeforge @faker-js/faker ts-morph reflect-metadata
```
    
Você também precisará habilitar duas opções no seu `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Uso Rápido (Quick Start)

**1. Defina seus DTOs:**

```typescript
// product.dto.ts
export class ProductDTO {
    sku: string;
    productName: string;
}
```
```typescript
// user.dto.ts
import { ProductDTO } from './product.dto';

export class UserDTO {
    id: string;
    name: string;
    email: string;
    age: number;
    orders: ProductDTO[]; // Array Aninhado
    favoriteProduct: ProductDTO; // Objeto Aninhado
}
```

**2. Configure a `TypeForge` (no seu `test-setup.ts` ou `beforeAll`):**
```typescript   
import { TypeForge, TypeRegistry } from '@innv/ts-typeforge';
import { UserDTO } from './dtos/user.dto';
import { ProductDTO } from './dtos/product.dto';

let forge: TypeForge;
let registry: TypeRegistry;

beforeAll(() => {
    registry = new TypeRegistry();

    // 1. Registre todos os DTOs que a forge pode precisar
    registry.register(UserDTO);
    registry.register(ProductDTO);

    // 2. Crie a forge
    forge = new TypeForge(registry);
});
```
**3. Use nos seus testes:**
```typescript
it('should create a user mock', () => {
    const user = forge.create(UserDTO);

    /*
    user = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        name: 'Brenda Smith',
        email: 'Brenda.Smith@example.com',
        age: 42,
        orders: [
            { sku: 'YDWP21E4', productName: 'dolorem' }
        ],
        favoriteProduct: {
            sku: 'T8S1V9H7',
            productName: 'corporis'
        }
    }
    */

    expect(user.id).toBeString();
    expect(user.orders).toHaveLength(1);
    expect(user.orders[0].sku).toBeString();
});
```
## API Avançada

### `forge.create(DTO, options)`

#### `overrides`: Força valores específicos.
```typescript
const adminUser = forge.create(UserDTO, {
    overrides: {
        name: 'Admin User',
        age: 99,
    },
});
```
#### `arrayCounts`: Controla o tamanho de arrays.
```typescript
const userWith5Orders = forge.create(UserDTO, {
    arrayCounts: {
        orders: 5, // Cria 5 produtos no array 'orders'
    },
});
```
#### `emptyArrays`: Força um array a ser `[]`.
```typescript
const userNoOrders = forge.create(UserDTO, {
    emptyArrays: ['orders'],    
});
```
#### `generics`: Resolve tipos genéricos.
```typescript
// DTO: export class PageableDTO<T> { results: T[] }
import { PageableDTO } from './dtos/pageable.dto';

// NÃO se esqueça de registrar PageableDTO
registry.register(PageableDTO);

const userPage = forge.create<PageableDTO<UserDTO>>(PageableDTO, {
    generics: {
        results: {
            type: UserDTO, // O tipo que 'T' deve assumir
            count: 10,     // Cria 10 usuários
        },
    },
});

// userPage.results terá 10 UserDTOs
```

### `registry.register(DTO, options)`

#### `allowedValues`: Restringe valores (ótimo para Enums).
```typescript
enum UserStatus { ACTIVE = 'active', INACTIVE = 'inactive' }
// DTO: export class UserDTO { status: UserStatus }

registry.register(UserDTO, {
    allowedValues: {
        status: Object.values(UserStatus),
    },
});

// forge.create(UserDTO).status será 'active' ou 'inactive'
```
## Como Funciona?

`ts-typeforge` usa `ts-morph` para ler a estrutura estática do seu DTO (nomes de propriedades e tipos). Quando encontra um tipo aninhado (ex: `ProductDTO`), ele usa o `TypeRegistry` para encontrar o construtor `ProductDTO` real que você registrou no runtime. Isso cria a "ponte" entre a análise estática e a execução em tempo real, permitindo a automação.

## Contribuição

Contribuições são muito bem-vindas! Por favor, leia nosso `CONTRIBUTING.md` para saber como propor correções e novas features.

## Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).