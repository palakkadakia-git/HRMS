import { IsString } from 'class-validator';

/**
 * Body for PATCH /employees/:id/face-descriptor
 * `descriptor` is a JSON-serialised number[] (128 floats from face-api.js).
 */
export class SetFaceDescriptorDto {
  @IsString()
  descriptor: string; // JSON.stringify(Array.from(Float32Array))
}
