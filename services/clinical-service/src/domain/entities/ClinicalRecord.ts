import { AggregateRoot, Guard } from '@dental/shared-kernel';
import { OdontogramEntry } from '../value-objects/OdontogramEntry';

export interface ClinicalRecordProps {
  organizationId: string;
  patientId: string;
  appointmentId: string;
  doctorId: string;
  branchId: string;
  chiefComplaint?: string;
  diagnosis?: string;
  treatmentDone?: string;
  prescription?: string;
  nextVisitNotes?: string;
  odontogramEntries: OdontogramEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClinicalRecordProps {
  organizationId: string;
  patientId: string;
  appointmentId: string;
  doctorId: string;
  branchId: string;
  chiefComplaint?: string;
  diagnosis?: string;
  treatmentDone?: string;
  prescription?: string;
  nextVisitNotes?: string;
}

export class ClinicalRecord extends AggregateRoot {
  private props: ClinicalRecordProps;

  private constructor(props: ClinicalRecordProps, id?: string) {
    super(id);
    this.props = props;
  }

  static create(createProps: CreateClinicalRecordProps, id?: string): ClinicalRecord {
    Guard.againstEmpty(createProps.organizationId, 'ClinicalRecord.organizationId');
    Guard.againstEmpty(createProps.patientId, 'ClinicalRecord.patientId');
    Guard.againstEmpty(createProps.appointmentId, 'ClinicalRecord.appointmentId');
    Guard.againstEmpty(createProps.doctorId, 'ClinicalRecord.doctorId');

    const now = new Date();
    return new ClinicalRecord(
      {
        ...createProps,
        odontogramEntries: [],
        createdAt: now,
        updatedAt: now,
      },
      id,
    );
  }

  static reconstitute(props: ClinicalRecordProps, id: string): ClinicalRecord {
    return new ClinicalRecord(props, id);
  }

  addOdontogramEntry(entry: OdontogramEntry): void {
    // Replace entry for same tooth + surface if it already exists
    const existing = this.props.odontogramEntries.findIndex(
      (e) => e.toothNumber === entry.toothNumber && e.surface === entry.surface,
    );
    if (existing >= 0) {
      this.props.odontogramEntries[existing] = entry;
    } else {
      this.props.odontogramEntries.push(entry);
    }
    this.props.updatedAt = new Date();
  }

  update(fields: Partial<Pick<ClinicalRecordProps, 'chiefComplaint' | 'diagnosis' | 'treatmentDone' | 'prescription' | 'nextVisitNotes'>>): void {
    Object.assign(this.props, fields);
    this.props.updatedAt = new Date();
  }

  get organizationId(): string { return this.props.organizationId; }
  get patientId(): string { return this.props.patientId; }
  get appointmentId(): string { return this.props.appointmentId; }
  get doctorId(): string { return this.props.doctorId; }
  get branchId(): string { return this.props.branchId; }
  get chiefComplaint(): string | undefined { return this.props.chiefComplaint; }
  get diagnosis(): string | undefined { return this.props.diagnosis; }
  get treatmentDone(): string | undefined { return this.props.treatmentDone; }
  get prescription(): string | undefined { return this.props.prescription; }
  get nextVisitNotes(): string | undefined { return this.props.nextVisitNotes; }
  get odontogramEntries(): OdontogramEntry[] { return [...this.props.odontogramEntries]; }
}
