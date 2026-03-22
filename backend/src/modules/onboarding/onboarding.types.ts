export interface RegisterDTO {
  workshop_name: string;
  email:         string;
  password:      string;
  whatsapp:      string; // E.164 after normalization
  cuit:          string; // digits only after normalization
}

export interface VerifyOtpDTO {
  registration_id: string;
  otp_code:        string; // 6 digits
}

export interface ResendOtpDTO {
  registration_id: string;
}

export interface PendingRegistration {
  id:             string;
  workshop_name:  string;
  email:          string;
  password_hash:  string;
  cuit:           string;
  whatsapp:       string;
  otp_hash:       string;
  otp_expires_at: string;
  otp_attempts:   number;
  resend_count:   number;
  last_resend_at: string | null;
  status:         "pending" | "verified" | "expired";
}

export interface RegisterResponse {
  token:       string;
  expires_in:  string;
  user: {
    id:          string;
    email:       string;
    full_name:   string;
    role:        string;
    tenant_id:   string;
    tenant_name: string;
    tenant_slug: string;
  };
}

export interface VerifyResponse {
  token:       string;
  expires_in:  string;
  user: {
    id:          string;
    email:       string;
    full_name:   string;
    role:        string;
    tenant_id:   string;
    tenant_name: string;
    tenant_slug: string;
  };
}
