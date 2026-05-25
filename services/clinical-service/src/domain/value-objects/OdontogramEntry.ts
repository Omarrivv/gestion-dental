import { ValueObject, Guard } from '@dental/shared-kernel';

export enum ToothSurface {
  MESIAL = 'M',
  DISTAL = 'D',
  OCCLUSAL = 'O',
  VESTIBULAR = 'V',
  LINGUAL = 'L',
}

export enum ToothCondition {
  HEALTHY = 'HEALTHY',
  CAVITY = 'CAVITY',
  FILLED = 'FILLED',
  CROWN = 'CROWN',
  MISSING = 'MISSING',
  IMPLANT = 'IMPLANT',
  ROOT_CANAL = 'ROOT_CANAL',
  EXTRACTION_NEEDED = 'EXTRACTION_NEEDED',
  BRIDGE_ABUTMENT = 'BRIDGE_ABUTMENT',
  BRIDGE_PONTIC = 'BRIDGE_PONTIC',
  SEALED = 'SEALED',
}

// FDI World Dental Federation notation: 11-18, 21-28, 31-38, 41-48
const VALID_TOOTH_NUMBERS = new Set<number>([
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
  // Primary dentition (5x notation)
  51, 52, 53, 54, 55,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75,
  81, 82, 83, 84, 85,
]);

interface OdontogramEntryProps {
  toothNumber: number;
  surface: string | null; // null = whole tooth condition
  condition: ToothCondition;
  notes?: string;
}

export class OdontogramEntry extends ValueObject<OdontogramEntryProps> {
  private constructor(props: OdontogramEntryProps) {
    super(props);
  }

  static create(
    toothNumber: number,
    condition: ToothCondition,
    surface?: string,
    notes?: string,
  ): OdontogramEntry {
    if (!VALID_TOOTH_NUMBERS.has(toothNumber)) {
      throw new Error(`Invalid FDI tooth number: ${toothNumber}`);
    }
    if (surface && !Object.values(ToothSurface).includes(surface as ToothSurface)) {
      throw new Error(`Invalid tooth surface: ${surface}`);
    }
    if (!Object.values(ToothCondition).includes(condition)) {
      throw new Error(`Invalid tooth condition: ${condition}`);
    }
    return new OdontogramEntry({
      toothNumber,
      surface: surface ?? null,
      condition,
      notes,
    });
  }

  get toothNumber(): number { return this.props.toothNumber; }
  get surface(): string | null { return this.props.surface; }
  get condition(): ToothCondition { return this.props.condition; }
  get notes(): string | undefined { return this.props.notes; }
}
