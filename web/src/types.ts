export interface Challenge {
  id: string;
  title: string;
  description: string;
  tags: string[];
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
