/**
 * Lightweight, robust DICOM parser and frame extractor in pure TypeScript.
 * Parses Part 10 DICOM files (.dcm, .dicom) without heavy external dependencies.
 * Extracts metadata and converts uncompressed/raw pixel data (monochrome1, monochrome2, RGB)
 * including multi-frame DICOMs into standard PNG/JPEG image files.
 */

export interface DicomMetadata {
  patientName?: string
  patientId?: string
  studyInstanceUid?: string
  seriesInstanceUid?: string
  sopInstanceUid?: string
  studyDescription?: string
  seriesDescription?: string
  modality?: string
  photometricInterpretation?: string
  rows?: number
  columns?: number
  numberOfFrames?: number
  bitsAllocated?: number
  bitsStored?: number
  highBit?: number
  pixelRepresentation?: number
  rescaleIntercept?: number
  rescaleSlope?: number
  windowCenter?: number
  windowWidth?: number
  samplesPerPixel?: number
  planarConfiguration?: number
}

export interface ExtractedDicomFrame {
  frameIndex: number
  totalFrames: number
  width: number
  height: number
  blob: Blob
  dataUrl: string
  metadata: DicomMetadata
}

export class DicomParser {
  private view: DataView
  private bytes: Uint8Array
  private littleEndian = true
  private explicitVR = true
  private offset = 0

  constructor(arrayBuffer: ArrayBuffer) {
    this.bytes = new Uint8Array(arrayBuffer)
    this.view = new DataView(arrayBuffer)
  }

  public parse(): { metadata: DicomMetadata; pixelDataOffset: number; pixelDataLength: number } {
    const metadata: DicomMetadata = {
      numberOfFrames: 1,
      samplesPerPixel: 1,
      bitsAllocated: 8,
      bitsStored: 8,
      pixelRepresentation: 0,
      rescaleIntercept: 0,
      rescaleSlope: 1,
    }

    let pixelDataOffset = -1
    let pixelDataLength = 0

    // Check DICM prefix at offset 128
    if (this.bytes.length > 132) {
      const magic = String.fromCharCode(
        this.bytes[128],
        this.bytes[129],
        this.bytes[130],
        this.bytes[131],
      )
      if (magic === 'DICM') {
        this.offset = 132
      } else {
        this.offset = 0
      }
    } else {
      this.offset = 0
    }

    const len = this.bytes.length

    while (this.offset + 8 <= len) {
      const group = this.view.getUint16(this.offset, this.littleEndian)
      const element = this.view.getUint16(this.offset + 2, this.littleEndian)
      this.offset += 4

      // Group 0002 is always Explicit VR Little Endian in standard Part 10 DICOM
      let vr = ''
      let valueLength = 0

      // Check if VR is explicit or implicit
      if (group === 0x0002 || this.explicitVR) {
        const c1 = String.fromCharCode(this.bytes[this.offset])
        const c2 = String.fromCharCode(this.bytes[this.offset + 1])

        // Verify if c1 and c2 are uppercase ASCII letters (standard VR)
        const isStandardVR = /^[A-Z]{2}$/.test(c1 + c2)
        if (isStandardVR) {
          vr = c1 + c2
          this.offset += 2

          // 32-bit length VRs: OB, OW, OF, OD, SQ, UC, UR, UT, UN
          if (['OB', 'OW', 'OF', 'OD', 'SQ', 'UC', 'UR', 'UT', 'UN'].includes(vr)) {
            this.offset += 2 // skip reserved 2 bytes
            valueLength = this.view.getUint32(this.offset, this.littleEndian)
            this.offset += 4
          } else {
            valueLength = this.view.getUint16(this.offset, this.littleEndian)
            this.offset += 2
          }
        } else {
          // Implicit VR Little Endian fallback
          this.explicitVR = false
          valueLength = this.view.getUint32(this.offset, this.littleEndian)
          this.offset += 4
        }
      } else {
        valueLength = this.view.getUint32(this.offset, this.littleEndian)
        this.offset += 4
      }

      // Check for Pixel Data (7FE0, 0010)
      if (group === 0x7fe0 && element === 0x0010) {
        pixelDataOffset = this.offset
        pixelDataLength = valueLength === 0xffffffff ? len - this.offset : valueLength
        break
      }

      // Transfer Syntax UID (0002, 0010)
      if (group === 0x0002 && element === 0x0010) {
        const syntax = this.readString(valueLength).split(String.fromCharCode(0))[0].trim()
        if (syntax === '1.2.840.10008.1.2') {
          // Implicit VR Little Endian
          this.explicitVR = false
        } else if (syntax === '1.2.840.10008.1.2.2') {
          // Explicit VR Big Endian
          this.littleEndian = false
        } else {
          // Explicit VR Little Endian (Default / compressed / JPEG)
          this.explicitVR = true
        }
        continue
      }

      // Read tags of interest
      if (valueLength > 0 && valueLength < 10000) {
        // Patient Name (0010, 0010)
        if (group === 0x0010 && element === 0x0010) {
          metadata.patientName = this.readString(valueLength)
        }
        // Patient ID (0010, 0020)
        else if (group === 0x0010 && element === 0x0020) {
          metadata.patientId = this.readString(valueLength)
        }
        // Modality (0008, 0060)
        else if (group === 0x0008 && element === 0x0060) {
          metadata.modality = this.readString(valueLength)
        }
        // Study Description (0008, 1030)
        else if (group === 0x0008 && element === 0x1030) {
          metadata.studyDescription = this.readString(valueLength)
        }
        // Series Description (0008, 103E)
        else if (group === 0x0008 && element === 0x103e) {
          metadata.seriesDescription = this.readString(valueLength)
        }
        // Study Instance UID (0020, 000D)
        else if (group === 0x0020 && element === 0x000d) {
          metadata.studyInstanceUid = this.readString(valueLength)
        }
        // Series Instance UID (0020, 000E)
        else if (group === 0x0020 && element === 0x000e) {
          metadata.seriesInstanceUid = this.readString(valueLength)
        }
        // SOP Instance UID (0008, 0018)
        else if (group === 0x0008 && element === 0x0018) {
          metadata.sopInstanceUid = this.readString(valueLength)
        }
        // Photometric Interpretation (0028, 0004)
        else if (group === 0x0028 && element === 0x0004) {
          metadata.photometricInterpretation = this.readString(valueLength)
        }
        // Rows (0028, 0010)
        else if (group === 0x0028 && element === 0x0010) {
          metadata.rows = this.readUint(valueLength)
        }
        // Columns (0028, 0011)
        else if (group === 0x0028 && element === 0x0011) {
          metadata.columns = this.readUint(valueLength)
        }
        // Number of Frames (0028, 0008)
        else if (group === 0x0028 && element === 0x0008) {
          const str = this.readString(valueLength)
          const n = parseInt(str, 10)
          if (!isNaN(n) && n > 0) metadata.numberOfFrames = n
        }
        // Bits Allocated (0028, 0100)
        else if (group === 0x0028 && element === 0x0100) {
          metadata.bitsAllocated = this.readUint(valueLength)
        }
        // Bits Stored (0028, 0101)
        else if (group === 0x0028 && element === 0x0101) {
          metadata.bitsStored = this.readUint(valueLength)
        }
        // High Bit (0028, 0102)
        else if (group === 0x0028 && element === 0x0102) {
          metadata.highBit = this.readUint(valueLength)
        }
        // Pixel Representation (0028, 0103)
        else if (group === 0x0028 && element === 0x0103) {
          metadata.pixelRepresentation = this.readUint(valueLength)
        }
        // Samples Per Pixel (0028, 0002)
        else if (group === 0x0028 && element === 0x0002) {
          metadata.samplesPerPixel = this.readUint(valueLength)
        }
        // Planar Configuration (0028, 0006)
        else if (group === 0x0028 && element === 0x0006) {
          metadata.planarConfiguration = this.readUint(valueLength)
        }
        // Rescale Intercept (0028, 1052)
        else if (group === 0x0028 && element === 1052) {
          const v = parseFloat(this.readString(valueLength))
          if (!isNaN(v)) metadata.rescaleIntercept = v
        }
        // Rescale Slope (0028, 1053)
        else if (group === 0x0028 && element === 1053) {
          const v = parseFloat(this.readString(valueLength))
          if (!isNaN(v)) metadata.rescaleSlope = v
        }
        // Window Center (0028, 1050)
        else if (group === 0x0028 && element === 1050) {
          const v = parseFloat(this.readString(valueLength).split('\\')[0])
          if (!isNaN(v)) metadata.windowCenter = v
        }
        // Window Width (0028, 1051)
        else if (group === 0x0028 && element === 1051) {
          const v = parseFloat(this.readString(valueLength).split('\\')[0])
          if (!isNaN(v)) metadata.windowWidth = v
        } else {
          this.offset += valueLength
        }
      } else {
        if (valueLength === 0xffffffff) {
          // Sequence item or unknown length - skip until delimitation or safe boundary
          this.offset += 4
        } else {
          this.offset += valueLength
        }
      }
    }

    return { metadata, pixelDataOffset, pixelDataLength }
  }

  private readString(length: number): string {
    const slice = this.bytes.subarray(this.offset, this.offset + length)
    this.offset += length
    let str = ''
    for (let i = 0; i < slice.length; i++) {
      if (slice[i] === 0) break // null terminator
      str += String.fromCharCode(slice[i])
    }
    return str.trim()
  }

  private readUint(length: number): number {
    let val = 0
    if (length === 2) {
      val = this.view.getUint16(this.offset, this.littleEndian)
      this.offset += 2
    } else if (length === 4) {
      val = this.view.getUint32(this.offset, this.littleEndian)
      this.offset += 4
    } else if (length === 1) {
      val = this.bytes[this.offset]
      this.offset += 1
    } else {
      this.offset += length
    }
    return val
  }
}

/**
 * Extracts visual frames from a DICOM File or ArrayBuffer.
 * Returns array of ExtractedDicomFrame with width, height, dataUrl, Blob and metadata.
 */
export async function extractDicomFrames(
  dicomSource: File | Blob | ArrayBuffer,
): Promise<ExtractedDicomFrame[]> {
  const arrayBuffer =
    dicomSource instanceof ArrayBuffer ? dicomSource : await (dicomSource as Blob).arrayBuffer()

  const parser = new DicomParser(arrayBuffer)
  const { metadata, pixelDataOffset, pixelDataLength } = parser.parse()

  const rows = metadata.rows || 512
  const columns = metadata.columns || 512
  const numFrames = metadata.numberOfFrames || 1
  const samplesPerPixel = metadata.samplesPerPixel || 1
  const bitsAllocated = metadata.bitsAllocated || 8
  const photometric = (metadata.photometricInterpretation || 'MONOCHROME2').toUpperCase()
  const bytesPerPixel = Math.ceil(bitsAllocated / 8)

  if (pixelDataOffset <= 0 || pixelDataOffset >= arrayBuffer.byteLength) {
    throw new Error('Pixel Data (7FE0,0010) não encontrado no arquivo DICOM.')
  }

  const rawPixels = new Uint8Array(
    arrayBuffer,
    pixelDataOffset,
    Math.min(pixelDataLength, arrayBuffer.byteLength - pixelDataOffset),
  )
  const framePixelCount = rows * columns
  const frameByteSize = framePixelCount * samplesPerPixel * bytesPerPixel

  const frames: ExtractedDicomFrame[] = []

  for (let f = 0; f < numFrames; f++) {
    const frameOffset = f * frameByteSize
    if (frameOffset >= rawPixels.length && f > 0) {
      break
    }

    const frameBytes = rawPixels.subarray(frameOffset, frameOffset + frameByteSize)
    const canvas = document.createElement('canvas')
    canvas.width = columns
    canvas.height = rows
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Falha ao inicializar contexto 2D para renderização de frame DICOM.')
    }

    const imgData = ctx.createImageData(columns, rows)
    const dst = imgData.data

    if (samplesPerPixel === 3) {
      // RGB / YBR (assuming RGB format in ultrasound)
      for (let i = 0, j = 0; i < framePixelCount; i++, j += 4) {
        const srcIdx = i * 3
        dst[j] = frameBytes[srcIdx] || 0
        dst[j + 1] = frameBytes[srcIdx + 1] || 0
        dst[j + 2] = frameBytes[srcIdx + 2] || 0
        dst[j + 3] = 255
      }
    } else {
      // Monochrome (Ultrasound standard grayscale)
      const isMonochrome1 = photometric === 'MONOCHROME1' // 0 is white
      const windowCenter = metadata.windowCenter ?? (bitsAllocated === 16 ? 2048 : 128)
      const windowWidth = metadata.windowWidth ?? (bitsAllocated === 16 ? 4096 : 256)
      const halfWidth = windowWidth / 2
      const minVal = windowCenter - halfWidth
      const maxVal = windowCenter + halfWidth

      if (bitsAllocated === 16) {
        const view16 = new DataView(frameBytes.buffer, frameBytes.byteOffset, frameBytes.byteLength)
        const isSigned = metadata.pixelRepresentation === 1

        for (let i = 0, j = 0; i < framePixelCount; i++, j += 4) {
          const byteIdx = i * 2
          let rawVal = 0
          if (byteIdx + 1 < frameBytes.byteLength) {
            rawVal = isSigned ? view16.getInt16(byteIdx, true) : view16.getUint16(byteIdx, true)
          }

          // Apply Rescale Intercept / Slope if present
          const modalityVal =
            rawVal * (metadata.rescaleSlope || 1) + (metadata.rescaleIntercept || 0)

          // Window leveling
          let gray = 0
          if (modalityVal <= minVal) gray = 0
          else if (modalityVal >= maxVal) gray = 255
          else gray = Math.round(((modalityVal - minVal) / windowWidth) * 255)

          if (isMonochrome1) gray = 255 - gray

          dst[j] = gray
          dst[j + 1] = gray
          dst[j + 2] = gray
          dst[j + 3] = 255
        }
      } else {
        // 8-bit monochrome
        for (let i = 0, j = 0; i < framePixelCount; i++, j += 4) {
          let gray = frameBytes[i] || 0
          if (isMonochrome1) gray = 255 - gray
          dst[j] = gray
          dst[j + 1] = gray
          dst[j + 2] = gray
          dst[j + 3] = 255
        }
      }
    }

    ctx.putImageData(imgData, 0, 0)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b)
          else reject(new Error('Falha ao exportar frame para Blob'))
        },
        'image/jpeg',
        0.92,
      )
    })

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

    frames.push({
      frameIndex: f + 1,
      totalFrames: numFrames,
      width: columns,
      height: rows,
      blob,
      dataUrl,
      metadata,
    })
  }

  return frames
}
