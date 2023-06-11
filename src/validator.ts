import { HEADER_BYTE_LENGTH } from './type-specification'
import { deserializeHeader } from './type-specification/header'
import { deserializeArray, deserializeObject, ElementMaps } from './viewer/container'
import { Type } from './types'
import { Bytes, bytesToHex, equalBytes, keccak256Hash } from './utils'
import { ChunkInclusionProof, fileAddressFromInclusionProof } from '@fairdatasociety/bmt-js'

export class BeeSonStore {
  public handlerMapping: Map<string, BeeSonHandler> = new Map()

  public addHandler(dnaBytes: Uint8Array) {
    const superBeeSonRef = bytesToHex(keccak256Hash(dnaBytes))
    this.handlerMapping.set(superBeeSonRef, new BeeSonHandler(this, superBeeSonRef, dnaBytes))
  }
}

/** Loads BeeSon DNA and initiates attribute mappings */
export class BeeSonHandler {
  private type: Type
  private elementMaps: ElementMaps

  constructor(private beeSonStore: BeeSonStore, private superBeeSonRef: string, dnaBytes: Uint8Array) {
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
   * Asserts data is subsumed under the RootHash
   *
   * @param rootHash hash to validate against
   * @param headerSegment encode beeson version and data type
   * @param dnaInclusionProof inclusion proof data for DNA of beeSon (first 2 segments)
   * @param dataInclusionProof inclusion proof for data in Data Implementation
   * @param datasegmentIndex segment position in the whole datablob
   * @param data data segment to prove
   * @throws error if roothash does not encode DNA or data
   */
  public validate(
    rootHash: Uint8Array,
    headerSegment: Uint8Array,
    dnaInclusionProof: ChunkInclusionProof<8>[],
    dataInclusionProof: ChunkInclusionProof<8>[],
    datasegmentIndex: number,
    data: Uint8Array,
  ) {
    // TODO versioncheck from header
    if (bytesToHex(dnaInclusionProof[0].sisterSegments[0]) !== this.superBeeSonRef) {
      throw new Error('SuperBeeSonReference is not matching')
    }
    if (!equalBytes(rootHash, fileAddressFromInclusionProof(dnaInclusionProof, headerSegment, 0))) {
      throw new Error('DNA is not under rootHash')
    }
    if (!equalBytes(rootHash, fileAddressFromInclusionProof(dataInclusionProof, data, datasegmentIndex))) {
      throw new Error('DNA is not under rootHash')
    }
  }

  public getElementType(datasegmentIndex: number): Type {
    const { elementIndex, segmentStart } = this.getElementIndex(datasegmentIndex)
    const superTypeRef = this.elementMaps.superTypeRefs.get(elementIndex)
    if (superTypeRef) {
      const lowerBeeSonHandler = this.beeSonStore.handlerMapping.get(bytesToHex(superTypeRef))
      if (!lowerBeeSonHandler) throw new Error('SuperBeeSon Reference in lower level is not registered')

      return lowerBeeSonHandler.getElementType(datasegmentIndex - segmentStart)
    }

    return this.elementMaps.elementProps[elementIndex].type
  }

  private getElementIndex(datasegmentIndex: number): { elementIndex: number; segmentStart: number } {
    let segmentStart = 0
    let elementIndex = 0
    for (const [i, e] of Object.entries(this.elementMaps.elementProps)) {
      if (datasegmentIndex <= segmentStart) break
      segmentStart += e.segmentLength
      elementIndex = Number(i)
    }

    return { elementIndex, segmentStart }
  }
}
