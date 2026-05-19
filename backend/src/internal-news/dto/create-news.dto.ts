import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(220)
  summary: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  body: string;
}
