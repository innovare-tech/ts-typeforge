import { TypeRegistry, TypeRegistryOptions } from '../src';
import { UserDTO } from './fixtures/user.dto';
import { AddressDTO } from './fixtures/address.dto';

describe('TypeRegistry', () => {
  let registry: TypeRegistry;

  beforeEach(() => {
    registry = new TypeRegistry();
  });

  it('should register a class without options', () => {
    registry.register(UserDTO);
    const options = registry.get(UserDTO);
    expect(options).toBeDefined();
    expect(options).toEqual({}); // Deve ser um objeto vazio por padrão
  });

  it('should register a class with options', () => {
    const userOptions: TypeRegistryOptions = {
      allowedValues: { status: ['ACTIVE'] },
    };
    registry.register(UserDTO, userOptions);
    const options = registry.get(UserDTO);
    expect(options).toBeDefined();
    expect(options).toEqual(userOptions);
  });

  it('should return undefined for an unregistered class', () => {
    const options = registry.get(UserDTO);
    expect(options).toBeUndefined();
  });

  it('should find a registered class by name (with options)', () => {
    const userOptions: TypeRegistryOptions = {
      allowedValues: { status: ['ACTIVE'] },
    };
    registry.register(UserDTO, userOptions);
    const foundConstructor = registry.findByClassName('UserDTO');
    expect(foundConstructor).toBe(UserDTO);
  });

  it('should find a registered class by name (without options)', () => {
    registry.register(AddressDTO); // Registra sem opções
    const foundConstructor = registry.findByClassName('AddressDTO');
    expect(foundConstructor).toBe(AddressDTO);
  });

  it('should return undefined when finding an unregistered class name', () => {
    const foundConstructor = registry.findByClassName('NonExistentDTO');
    expect(foundConstructor).toBeUndefined();
  });

  it('should overwrite options if registered again', () => {
    registry.register(UserDTO, { allowedValues: { status: ['A'] } });
    registry.register(UserDTO, { allowedValues: { status: ['B'] } }); // Sobrescreve
    const options = registry.get(UserDTO);
    expect(options?.allowedValues?.['status']).toEqual(['B']);
  });
});
