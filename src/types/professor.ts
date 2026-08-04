export interface Professor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  office: string | null;
  office_hours: string | null;
  notes: string | null;
}

export type SubjectStaffRole = "complementary" | "monitor";

export interface SubjectStaffMember extends Professor {
  role: SubjectStaffRole;
}
