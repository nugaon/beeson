import { TypeManager } from './type-specification'
import { Type } from './types'

export class SuperValidator<T extends Type> {
  constructor(private readonly typeManager: TypeManager<T>) {}

  /**
   *
   * @param dnaSisterSegments the data level is known and can be omitted.
   * @param dataSisterSegments sister segments of the data.
   * @param dataStartSegmentIndex starting index of the data
   * @param data data segment
   */
  public validate(
    dnaSisterSegments: Uint8Array[],
    dataSisterSegments: Uint8Array[],
    dataStartSegmentIndex: number,
    data: Uint8Array,
  ) {}
}
