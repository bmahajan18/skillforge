import sys
import json
import time
import traceback
import io

def run_tests():
    # Read payload from stdin
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({"status": "RUNTIME_ERROR", "error_message": "Empty test payload"}))
            return
        
        payload = json.loads(raw_input)
    except Exception as e:
        print(json.dumps({"status": "RUNTIME_ERROR", "error_message": f"Failed to parse execution payload: {str(e)}"}))
        return

    user_code = payload.get("code", "")
    test_cases = payload.get("test_cases", [])

    # Global namespace for user code execution
    user_globals = {}
    
    # Capture stdout
    old_stdout = sys.stdout
    captured_output = io.StringIO()

    start_time = time.time()
    try:
        # Compile user code
        sys.stdout = captured_output
        exec(user_code, user_globals)
        sys.stdout = old_stdout
    except Exception as e:
        sys.stdout = old_stdout
        print(json.dumps({
            "status": "COMPILE_ERROR",
            "error_message": f"Syntax/Compile Error: {traceback.format_exc()}",
            "execution_time_ms": int((time.time() - start_time) * 1000)
        }))
        return

    # Identify primary function defined by user
    func_name = None
    for name, val in user_globals.items():
        if callable(val) and not name.startswith("__"):
            func_name = name
            break

    if not func_name:
        print(json.dumps({
            "status": "RUNTIME_ERROR",
            "error_message": "No callable function found in submission code.",
            "execution_time_ms": int((time.time() - start_time) * 1000)
        }))
        return

    target_func = user_globals[func_name]

    passed_count = 0
    total_count = len(test_cases)
    first_failure = None

    for idx, tc in enumerate(test_cases):
        inputs = tc.get("input", {})
        expected = tc.get("expected_output")

        try:
            # Pass dictionary values as keyword or positional args
            if isinstance(inputs, dict):
                result = target_func(**inputs)
            elif isinstance(inputs, list):
                result = target_func(*inputs)
            else:
                result = target_func(inputs)

            if result == expected:
                passed_count += 1
            else:
                if not first_failure:
                    first_failure = f"Test Case {idx+1} Failed: Expected {json.dumps(expected)}, got {json.dumps(result)}"
        except Exception as e:
            if not first_failure:
                first_failure = f"Test Case {idx+1} Runtime Error: {str(e)}"

    total_time_ms = int((time.time() - start_time) * 1000)
    stdout_str = captured_output.getvalue()

    status = "PASSED" if passed_count == total_count else "FAILED"

    output_payload = {
        "status": status,
        "passed_count": passed_count,
        "total_count": total_count,
        "execution_time_ms": total_time_ms,
        "output": stdout_str[:2048], # Cap stdout at 2KB
        "error_message": first_failure or ""
    }

    print(json.dumps(output_payload))

if __name__ == "__main__":
    run_tests()
