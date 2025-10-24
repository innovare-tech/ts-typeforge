import {
  ClassDeclaration,
  EnumDeclaration,
  Project,
  PropertyDeclaration,
} from 'ts-morph';

/**
 * Classe singleton para gerenciar a instância do projeto ts-morph.
 */
export class TypeInspector {
  private static instance: TypeInspector;
  public readonly project: Project;

  /**
   * Construtor privado para o singleton.
   * @param tsConfigFilePath Caminho para o tsconfig.json do projeto.
   */
  private constructor(tsConfigFilePath: string = 'tsconfig.json') {
    this.project = new Project({
      tsConfigFilePath,
    });
  }

  /**
   * Obtém a instância singleton do TypeInspector.
   * @param tsConfigFilePath (Opcional) Usado apenas na primeira inicialização.
   * @returns A instância do TypeInspector.
   */
  public static getInstance(
    tsConfigFilePath: string = 'tsconfig.json',
  ): TypeInspector {
    if (!TypeInspector.instance) {
      TypeInspector.instance = new TypeInspector(tsConfigFilePath);
    }
    return TypeInspector.instance;
  }

  /**
   * Encontra uma declaração de classe pelo nome em todos os arquivos fonte.
   * @param className O nome da classe a ser encontrada.
   * @returns A ClassDeclaration ou undefined.
   */
  public findClass(className: string): ClassDeclaration | undefined {
    const sourceFiles = this.project.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      const foundClass = sourceFile.getClass(className);
      if (foundClass) {
        return foundClass;
      }
    }
    return undefined;
  }

  /**
   * Obtém todas as propriedades de uma classe.
   * @param className O nome da classe.
   * @returns Um array de PropertyDeclaration.
   */
  public getProperties(className: string): PropertyDeclaration[] {
    const classDefinition = this.findClass(className);
    return classDefinition ? classDefinition.getProperties() : [];
  }

  /**
   * Extrai os valores de um enum a partir da propriedade.
   * @param propertyDeclaration A propriedade que é do tipo Enum.
   * @returns Um Record<string, string | number> com os valores do enum.
   */
  public extractEnumValues(
    propertyDeclaration: PropertyDeclaration,
  ): Record<string | number, string | number> {
    const propertyType = propertyDeclaration.getType();
    const typeSymbol = propertyType.getSymbol();
    const enumDecl = typeSymbol?.getDeclarations()[0];

    if (enumDecl instanceof EnumDeclaration) {
      const members = enumDecl.getMembers();
      const enumObj: Record<string | number, string | number> = {};
      members.forEach((m) => {
        enumObj[m.getName()] = m.getValue()!;
      });
      return enumObj;
    }
    return {};
  }
}
