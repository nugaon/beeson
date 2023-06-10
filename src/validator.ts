import { HEADER_BYTE_LENGTH } from './type-specification'
import { deserializeHeader } from './type-specification/header'
import { deserializeArray, deserializeObject, ElementMaps } from './viewer/container'
import { Type } from './types'
import { Bytes } from './utils'

/** Loads BeeSon DNA and initiates attribute mappings */
export class BeeSonMapper {
  private type: Type
  private elementMaps: ElementMaps
  constructor(dnaBytes: Uint8Array) {
    const typeSpecification: Uint8Array = dnaBytes.slice(HEADER_BYTE_LENGTH)
    const headerBytes: Bytes<32> = dnaBytes.slice(0, HEADER_BYTE_LENGTH) as Bytes<32>
    const header = deserializeHeader(headerBytes)
    this.type = header.type

    switch (this.type) {
      case Type.array: {
        this.elementMaps = deserializeArray(typeSpecification)
        break
      }
      case Type.object: {
        this.elementMaps = deserializeObject(typeSpecification)
        break
      }
      // TODO nullable container types
      default:
        throw new Error('Header type is not a strict container type')
    }
  }

  /**
   *
   * @param headerSegment
   * @param dnaSisterSegments
   * @param dataSisterSegments sister segments of the data.
   * @param accessor JSON key to access data. The levels are separated by dot
   * @param data data segment to prove
   */
  public validate(
    headerSegment: Uint8Array[],
    dataSisterSegments: Uint8Array[],
    accessor: string,
    data: Uint8Array,
  ) {
    this.splitAccessor()
  }

  private splitAccessor(accessor: string): { currentAccessor: string; nextAccessor: string } {
    const nextDot = accessor.indexOf('.')

    if (nextDot === -1) {
      return {
        currentAccessor: accessor,
        nextAccessor: '',
      }
    } else {
      return {
        currentAccessor: accessor.slice(0, nextDot),
        nextAccessor: accessor.slice(nextDot),
      }
    }
  }
}
