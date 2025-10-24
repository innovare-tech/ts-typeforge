/**
 * Define um tipo para um construtor de classe.
 */
export type Constructor<T> = new (...args: any[]) => T;

/**
 * Opções de configuração de registro para uma classe específica.
 */
export interface TypeRegistryOptions {
  /**
   * Mapeia um nome de propriedade a um array de valores permitidos.
   * Ex: { status: ['ACTIVE', 'INACTIVE', 'PENDING'] }
   */
  allowedValues?: Record<string, any[]>;
}

/**
 * Registra e fornece construtores de DTOs e suas configurações.
 * Esta é a "ponte" entre o runtime (construtores de classe) e a
 * análise estática (nomes de classe do ts-morph).
 */
export class TypeRegistry {
  private config = new Map<Constructor<any>, TypeRegistryOptions>();

  /**
   * Registra um construtor de classe no registro.
   * @param clazz O construtor da classe (ex: UserDTO).
   * @param options (Opcional) Configurações para esta classe.
   */
  public register<T>(
    clazz: Constructor<T>,
    options: TypeRegistryOptions = {},
  ): void {
    this.config.set(clazz, options);
  }

  /**
   * Recupera as opções de mock para uma classe.
   * @param clazz O construtor da classe.
   * @returns As opções de mock registradas, ou undefined.
   */
  public get<T>(clazz: Constructor<T>): TypeRegistryOptions | undefined {
    return this.config.get(clazz);
  }

  /**
   * Encontra um construtor registrado pelo nome da classe.
   * @param className O nome da classe (ex: "FeatureLanguageDTO").
   * @returns O construtor da classe, ou undefined.
   */
  public findByClassName(className: string): Constructor<any> | undefined {
    for (const constructor of this.config.keys()) {
      if (constructor.name === className) {
        return constructor;
      }
    }
    return undefined;
  }
}
