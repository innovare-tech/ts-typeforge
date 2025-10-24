import { faker } from '@faker-js/faker';
import 'reflect-metadata';
import { Type } from 'ts-morph';
import { TypeInspector } from './type-inspector';
import { Constructor, TypeRegistry } from './type-registry';

/**
 * Opções para configurar a criação de uma propriedade genérica (ex: T ou T[]).
 */
export interface GenericPropertyOptions<TItem> {
  /**
   * O construtor da classe que deve ser usado para o tipo genérico.
   * Ex: TmsAcquirerFeatureDTO
   */
  type: Constructor<TItem>;
  /**
   * O número de instâncias a serem criadas.
   */
  count?: number;
  /**
   * Opções de criação completas a serem passadas para CADA item genérico criado.
   */
  options?:
    | TypeForgeOptions<TItem>
    | ((index: number) => TypeForgeOptions<TItem>);
}

/**
 * Opções de criação para uma chamada `forge.create()`.
 */
export interface TypeForgeOptions<T> {
  /**
   * Um objeto de valores fixos para substituir propriedades específicas do mock.
   */
  overrides?: Partial<T>;
  /**
   * Usado para resolver tipos genéricos (ex: T ou T[]).
   */
  generics?: { [K in keyof T]?: GenericPropertyOptions<any> };
  /**
   * Especifica o número exato de itens a serem criados para qualquer propriedade de array.
   */
  arrayCounts?: { [K in keyof T]?: number };
  /**
   * Uma lista de chaves de propriedade (que são arrays)
   * que devem ser forçadas a serem um array vazio [].
   */
  emptyArrays?: (keyof T)[];
}

/**
 * Erro customizado lançado pela TypeForge quando uma classe aninhada não é registrada.
 */
export class TypeNotRegisteredError extends Error {
  /**
   * Cria uma instância do erro.
   * @param className O nome da classe não registrada (ex: "OrderDTO").
   * @param propertyName O nome da propriedade que usa a classe (ex: "orders").
   * @param isArray Indica se a propriedade é um array (ex: OrderDTO[]).
   */
  constructor(className: string, propertyName: string, isArray: boolean) {
    const propertyDescription = isArray
      ? `para o array "${propertyName}"`
      : `para a propriedade "${propertyName}"`;

    super(
      `[TypeForge] Classe aninhada "${className}" (${propertyDescription}) não foi encontrada no registro. ` +
        `Por favor, importe "${className}" e registre-o com "registry.register(${className})" no seu setup.`,
    );
    this.name = 'TypeNotRegisteredError';
  }
}

/**
 * Fábrica principal para criar instâncias de mock de DTOs.
 */
export class TypeForge {
  private readonly registry: TypeRegistry;
  private readonly inspector: TypeInspector;

  /**
   * Cria uma nova instância da TypeForge.
   * @param registry O TypeRegistry contendo os construtores de classe.
   * @param inspector (Opcional) Uma instância do TypeInspector.
   */
  constructor(registry: TypeRegistry, inspector?: TypeInspector) {
    this.registry = registry;
    this.inspector = inspector || TypeInspector.getInstance();
  }

  /**
   * Gera um valor primitivo falso (fake) com base no nome e tipo da propriedade.
   * @param propName O nome da propriedade (usado como dica).
   * @param propType O tipo ts-morph da propriedade.
   * @returns Um valor falso.
   */
  private generateSimpleValue(propName: string, propType: Type): any {
    const lowerPropName = propName.toLowerCase().replace(/_/g, '');

    // ... (toda a lógica do faker baseada em nomes) ...
    if (lowerPropName.endsWith('id') || lowerPropName.endsWith('uuid'))
      return faker.string.uuid();
    if (lowerPropName.includes('email')) return faker.internet.email();
    if (lowerPropName.includes('name')) return faker.person.fullName();
    if (lowerPropName.includes('date') || lowerPropName.endsWith('at'))
      return faker.date.recent();

    // ... (toda a lógica do faker baseada em tipos) ...
    if (propType.isString()) return faker.lorem.word();
    if (propType.isNumber()) return faker.number.int({ min: 1, max: 1000 });
    if (propType.isBoolean()) return faker.datatype.boolean();
    if (propType.getText() === 'Date') return faker.date.recent();

    return faker.lorem.word();
  }

  /**
   * Cria uma única instância de mock para uma classe.
   * @param clazz O construtor da classe a ser instanciada.
   * @param options Opções de criação.
   * @returns Uma instância de mock do tipo T.
   */
  public create<T extends object>(
    clazz: Constructor<T>,
    options: TypeForgeOptions<T> = {},
  ): T {
    const { overrides, generics, arrayCounts, emptyArrays } = options;
    const mockInstance = new clazz();
    const config = this.registry.get(clazz);
    const properties = this.inspector.getProperties(clazz.name);

    for (const property of properties) {
      const propName = property.getName();
      const propNameKey = propName as keyof T;
      const propType = property.getType();

      if (overrides && propNameKey in overrides) {
        mockInstance[propNameKey] = overrides[propNameKey]!;
        continue;
      }

      const allowed = config?.allowedValues?.[propName];
      if (allowed && allowed.length > 0) {
        (mockInstance as any)[propName] = faker.helpers.arrayElement(allowed);
        continue;
      }

      if (
        propType.isArray() &&
        emptyArrays &&
        emptyArrays.includes(propNameKey)
      ) {
        (mockInstance as any)[propName] = [];
        continue;
      }

      if (propType.isArray()) {
        const genericOptions = generics?.[propNameKey];
        const specificCount = arrayCounts?.[propNameKey];
        const defaultCount = 1;

        if (genericOptions) {
          const {
            type: genericClass,
            count = specificCount ?? defaultCount,
            options: itemOptions,
          } = genericOptions;
          (mockInstance as any)[propName] = this.createMany(
            count,
            genericClass,
            itemOptions,
          );
        } else {
          const elementType = propType.getArrayElementType();
          const count = specificCount ?? defaultCount;

          if (elementType?.isTypeParameter()) {
            (mockInstance as any)[propName] = [];
          } else if (elementType?.isClassOrInterface()) {
            const symbol = elementType.getSymbol();
            const className = symbol?.getName();

            if (className === 'Date') {
              (mockInstance as any)[propName] = Array.from(
                { length: count },
                () => this.generateSimpleValue(propName, elementType),
              );
              continue;
            }

            const nestedConstructor = className
              ? this.registry.findByClassName(className)
              : undefined;

            if (nestedConstructor) {
              (mockInstance as any)[propName] = this.createMany(
                count,
                nestedConstructor,
              );
            } else if (className) {
              throw new TypeNotRegisteredError(className, propName, true);
            } else {
              (mockInstance as any)[propName] = [];
            }
          } else {
            (mockInstance as any)[propName] = Array.from(
              { length: count },
              () => this.generateSimpleValue(propName, elementType!),
            );
          }
        }
        continue;
      }

      if (propType.isEnum()) {
        (mockInstance as any)[propName] = faker.helpers.enumValue(
          this.inspector.extractEnumValues(property),
        );
        continue;
      }

      if (propType.isTypeParameter()) {
        // ... (lógica de 'generics' para não-arrays) ...
      }

      if (propType.isClassOrInterface()) {
        const symbol = propType.getSymbol();
        const className = symbol?.getName();

        if (className === 'Date') {
          (mockInstance as any)[propName] = this.generateSimpleValue(
            propName,
            propType,
          );
          continue;
        }

        const nestedConstructor = className
          ? this.registry.findByClassName(className)
          : undefined;

        if (nestedConstructor) {
          (mockInstance as any)[propName] = this.create(nestedConstructor);
        } else if (className) {
          throw new TypeNotRegisteredError(className, propName, false);
        } else {
          (mockInstance as any)[propName] = this.generateSimpleValue(
            propName,
            propType,
          );
        }
        continue;
      }

      (mockInstance as any)[propName] = this.generateSimpleValue(
        propName,
        propType,
      );
    }

    return mockInstance;
  }

  /**
   * Cria um array de instâncias de mock.
   * @param count O número de instâncias a serem criadas.
   * @param clazz O construtor da classe.
   * @param options Opções de criação a serem aplicadas a cada instância.
   * @returns Um array de instâncias de mock do tipo T.
   */
  public createMany<T extends object>(
    count: number,
    clazz: Constructor<T>,
    options?: TypeForgeOptions<T> | ((index: number) => TypeForgeOptions<T>),
  ): T[] {
    const results: T[] = [];
    for (let i = 0; i < count; i++) {
      const currentOptions =
        typeof options === 'function' ? options(i) : options;
      results.push(this.create(clazz, currentOptions));
    }
    return results;
  }
}
