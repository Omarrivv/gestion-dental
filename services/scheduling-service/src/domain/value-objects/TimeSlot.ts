import { ValueObject, Guard } from '@dental/shared-kernel';
import { addMinutes } from 'date-fns';

interface TimeSlotProps {
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
}

export class TimeSlot extends ValueObject<TimeSlotProps> {
  private constructor(props: TimeSlotProps) {
    super(props);
  }

  static create(startAt: Date, durationMinutes: number): TimeSlot {
    Guard.againstNegative(durationMinutes, 'TimeSlot.durationMinutes');
    Guard.againstOutOfRange(durationMinutes, 5, 480, 'TimeSlot.durationMinutes');

    const endAt = addMinutes(startAt, durationMinutes);
    return new TimeSlot({ startAt, endAt, durationMinutes });
  }

  overlaps(other: TimeSlot): boolean {
    return this.props.startAt < other.props.endAt && this.props.endAt > other.props.startAt;
  }

  get startAt(): Date { return this.props.startAt; }
  get endAt(): Date { return this.props.endAt; }
  get durationMinutes(): number { return this.props.durationMinutes; }
}
