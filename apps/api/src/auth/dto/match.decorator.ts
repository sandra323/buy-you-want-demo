import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/** 校验当前字段与另一个字段相等（注册时 confirmPassword 对齐 password）。 */
export function IsMatch(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isMatch',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [related] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[
            related
          ];
          return value === relatedValue;
        },
      },
    });
  };
}
