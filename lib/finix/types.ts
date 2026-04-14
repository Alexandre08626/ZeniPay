export interface FinixTransferRequest {
  merchant: string;
  amount: number;
  currency: string;
  source: string;
  operation_key: "SALE" | "UNREFERENCED_REFUND";
  fraud_session_id: string;
  idempotency_id?: string;
  tags?: Record<string, string>;
  statement_descriptor?: string;
}

export interface FinixTransferResponse {
  id: string;
  state: "SUCCEEDED" | "FAILED" | "PENDING" | "CANCELED";
  amount: number;
  currency: string;
  failure_code?: string;
  failure_message?: string;
  source: string;
  merchant_identity: string;
  created_at: string;
  updated_at: string;
  _embedded?: { errors?: { message: string; code: string }[] };
}

export interface FinixPaymentInstrument {
  id: string;
  type: string;
  brand: string;
  last_four: string;
  name: string;
  [key: string]: unknown;
}

export interface FinixDispute {
  id: string;
  state: string;
  reason: string;
  amount: number;
  transfer: string;
  created_at: string;
  respond_by: string;
}

export interface CertificationStepResult {
  status: "PASS" | "FAIL" | "SKIP";
  details?: Record<string, unknown>;
  error?: string;
}

export interface CertificationReport {
  step_1_successful_transaction: CertificationStepResult;
  step_2_failed_transaction: CertificationStepResult;
  step_3_fraud_session_id: CertificationStepResult;
  step_4_idempotency: CertificationStepResult;
  step_5_tokenization_forms: CertificationStepResult;
  step_6_dispute_test: CertificationStepResult;
  all_passed: boolean;
  timestamp: string;
}
