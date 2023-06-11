import { deserializeUint16, deserializeUint32 } from '../marshalling/number-serializer'
import {
  ARRAY_TYPE_DEF_LENGTH,
  deserializeTypeSpecLengths as deserializeArrayTypeSpecLengths,
} from '../type-specification/array'
import {
  deserializeTypeSpecLengths as deserializeObjectTypeSpecLengths,
  OBJECT_TYPE_DEF_LENGTH,
} from '../type-specification/object'
import { assertBeeSonType, deserializeType, SUPER_BEESON_TYPE } from '../types'
import { Bytes, bytesToString, segmentSize, SEGMENT_SIZE } from '../utils'
import { ElementRandomAccess } from './types'

export type ElementMaps = {
  elementProps: ElementRandomAccess[]
  superTypeRefs: Map<number, Bytes<32>>
}

/**
 *
 * @param data raw beeson array TypeSpecification data without the blob header
 * @description copied from type-specification/array.ts
 * @returns
 */
export function deserializeArray(data: Uint8Array): ElementMaps {
  const lengths = deserializeArrayTypeSpecLengths(data)
  const { typeDefArrayLength, superTypeRefArrayLength } = lengths
  let offset = lengths.offset

  // after arrays it is padded from right
  const segmentsUntilSuperBeeSonRefs = segmentSize(
    lengths.offset + typeDefArrayLength * ARRAY_TYPE_DEF_LENGTH,
  )
  const bytesUntilSuperBeeSonRefs = segmentsUntilSuperBeeSonRefs * SEGMENT_SIZE

  // deserialize typedefs
  const elementProps: ElementRandomAccess[] = []
  const superTypeRefs: Map<number, Bytes<32>> = new Map() // key is the element index
  let i = 0
  let j = 0 // superTypeDef index
  let segmentIndex = 0 // data implementation in the handled container
  while (i < typeDefArrayLength) {
    const type = deserializeType(data.slice(offset, offset + 2) as Bytes<2>)
    const segmentLength = deserializeUint32(data.slice(offset + 2, offset + 6) as Bytes<4>)

    // superBeeSon handling
    if (Number(type) === SUPER_BEESON_TYPE) {
      const refOffset = bytesUntilSuperBeeSonRefs + j * SEGMENT_SIZE
      const superTypeRef = data.slice(refOffset, refOffset + SEGMENT_SIZE) as Bytes<32>

      superTypeRefs.set(i, superTypeRef)

      j++
    } else {
      // not superBeeSon
      assertBeeSonType(type)
    }

    elementProps.push({ segmentIndex, segmentLength, type })
    segmentIndex += segmentLength

    offset += ARRAY_TYPE_DEF_LENGTH
    i++
  }

  // error checks
  if (j !== superTypeRefArrayLength) {
    throw new Error(
      `There were ${j} superTypeDefintions when it should be exactly ${superTypeRefArrayLength}`,
    )
  }

  return {
    elementProps,
    superTypeRefs,
  }
}

export function deserializeObject(data: Uint8Array): ElementMaps {
  const lengths = deserializeObjectTypeSpecLengths(data)
  const { typeDefArrayLength, superTypeRefArrayLength, markersByteLength } = lengths
  let offset = lengths.offset

  // after arrays it is padded from right
  const segmentsUntilSuperBeeSonRefs = segmentSize(
    lengths.offset + typeDefArrayLength * OBJECT_TYPE_DEF_LENGTH + markersByteLength,
  )
  const bytesUntilSuperBeeSonRefs = segmentsUntilSuperBeeSonRefs * SEGMENT_SIZE
  const startMarkerByteIndex = offset + typeDefArrayLength * OBJECT_TYPE_DEF_LENGTH

  // deserialize typedefs
  const elementProps: ElementRandomAccess[] = []
  const superTypeRefs: Map<number, Bytes<32>> = new Map()
  let segmentIndex = 0
  let i = 0
  let j = 0 // superBeeSon index
  let markerOffset = 0
  while (i < typeDefArrayLength) {
    const type = deserializeType(data.slice(offset, offset + 2) as Bytes<2>)
    const segmentLength = deserializeUint32(data.slice(offset + 2, offset + 6) as Bytes<4>)

    const markerLength = deserializeUint16(data.slice(offset + 6, offset + 8) as Bytes<2>)
    const marker = bytesToString(
      data.slice(startMarkerByteIndex + markerOffset, startMarkerByteIndex + markerOffset + markerLength),
    )
    markerOffset += markerLength

    if (Number(type) === SUPER_BEESON_TYPE) {
      const refOffset = bytesUntilSuperBeeSonRefs + j * SEGMENT_SIZE
      const superTypeRef = data.slice(refOffset, refOffset + SEGMENT_SIZE) as Bytes<32>
      superTypeRefs.set(i, superTypeRef)

      j++
    } else {
      assertBeeSonType(type)
    }

    elementProps.push({ segmentIndex, segmentLength, type })
    segmentIndex += segmentLength

    offset += OBJECT_TYPE_DEF_LENGTH
    i++
  }

  if (j !== superTypeRefArrayLength) {
    throw new Error(
      `There were ${j} superTypeDefintions when it should be exactly ${superTypeRefArrayLength}`,
    )
  }

  return {
    elementProps,
    superTypeRefs,
  }
}
