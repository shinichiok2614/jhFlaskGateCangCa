export interface IEmployee {
  id?: number;
  employeeCode?: string;
  fullName?: string;
  position?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  licensePlate?: string | null;
  faceImagePath?: string | null;
}

export const defaultValue: Readonly<IEmployee> = {};
