export interface User {
  id: string;
  username: string;
  email: string;
  profile_picture_url: string | null;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  tags: string[];
  completed?: boolean;
}

export interface TestResult {
  test_num: string;
  exit_code: number;
  elapsed_ms: number;
  pass: boolean;
  stdout: string;
  stderr: string;
  expected: string;
}

export interface Submission {
  summary?: {
    run_id: string;
    total_tests: number;
    passed: number;
    failed: number;
    all_pass: boolean;
    results: TestResult[];
  };
  error?: string;
}

export interface SubmissionSummary {
  id: string;
  challenge_id: string;
  command: string;
  created_at: string;
  total_tests: number;
  passed: number;
  failed: number;
  all_pass: boolean;
  execution_time_ms: number;
}
