import {
  IsUrl,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUrlDto {
  @IsUrl({}, { message: 'originalUrl debe ser una URL válida' })
  originalUrl: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(10)
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'El alias solo puede contener letras, números y guiones',
  })
  alias?: string;
}
