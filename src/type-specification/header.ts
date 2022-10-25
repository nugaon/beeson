import { assertBeeSonType, deserializeType, Type } from '../types'
import { Bytes, equalBytes } from '../utils'

const BEESON_HEADER_ID = 1

export interface Header<T extends Type> {
  version: Version
  type: T
}

export enum Version {
  unpackedV0_1 = '0.1.0',
}

export function deserializeHeader(bytes: Bytes<32>): Header<Type> {
  const versionBytes = bytes.slice(0, 4) as Bytes<4>
  const version = deserializeVersion(versionBytes)
  const type = deserializeType(bytes.slice(30) as Bytes<2>)

  // version check
  if (!equalBytes(versionBytes, serializeVersion(Version.unpackedV0_1))) {
    throw new Error(`Not a valid BeeSon version hash`)
  }

  assertBeeSonType(type)

  return {
    type,
    version,
  }
}

export function deserializeVersion(bytes: Bytes<4>): Version {
  if (bytes[0] !== BEESON_HEADER_ID) {
    throw new Error(`Error at version deserialization: ${bytes[0]} is not a BeeSon type in the header`)
  }

  const version = deserializeVersionSemver(bytes.slice(1) as Bytes<3>)

  if (version !== Version.unpackedV0_1) {
    throw new Error(`Error at version deserialization: ${version} is not an existing BeeSon version`)
  }

  return version
}

export function serializeVersion(version: Version): Bytes<4> {
  return new Bytes([1, ...serializeVersionSemver(version)])
}

function serializeVersionSemver(version: Version): Bytes<3> {
  const versionArray = version.split('.').map(v => Number(v))

  return new Bytes([versionArray[0], versionArray[1], versionArray[2]])
}

function deserializeVersionSemver(bytes: Bytes<3>): Version {
  const strings: string[] = []
  for (const byte of bytes) {
    strings.push(byte.toString())
  }

  return strings.join('.') as Version
}

function isVersion(value: unknown): value is Version {
  return Object.values(Version).includes(value as Version)
}

export function assertVersion(value: unknown): asserts value is Version {
  if (!isVersion) throw new Error(`Not valid BeeSon version: ${value}`)
}
