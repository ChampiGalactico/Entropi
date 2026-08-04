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

export interface TeachingRole {
  id: number;
  name: string;
  color: string;
  icon: string | null;
}

export interface SubjectStaffMember extends Professor {
  role_id: number;
  role_name: string;
  role_color: string;
  role_icon: string | null;
}
