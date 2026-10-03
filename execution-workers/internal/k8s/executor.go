package k8s

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

type ExecutionResult struct {
	Status          string `json:"status"`
	PassedCount     int    `json:"passed_count"`
	TotalCount      int    `json:"total_count"`
	ExecutionTimeMS int    `json:"execution_time_ms"`
	Output          string `json:"output"`
	ErrorMessage    string `json:"error_message"`
}

type Executor struct {
	Clientset *kubernetes.Clientset
	Namespace string
}

func NewExecutor() *Executor {
	// Try in-cluster config first
	config, err := rest.InClusterConfig()
	if err != nil {
		// Fallback to kubeconfig
		kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
	}

	if err != nil {
		log.Printf("Notice: K8s cluster not detected (%v). Worker will use direct Docker container runner fallback for local dev.", err)
		return &Executor{Clientset: nil, Namespace: "default"}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Printf("Failed to create K8s client: %v", err)
		return &Executor{Clientset: nil, Namespace: "default"}
	}

	log.Println("Successfully connected to Kubernetes API server for Job scheduling")
	return &Executor{Clientset: clientset, Namespace: "default"}
}

func (e *Executor) RunSubmissionJob(ctx context.Context, subID, language string, payloadBytes []byte) (*ExecutionResult, error) {
	if e.Clientset != nil {
		return e.runK8sJob(ctx, subID, language, payloadBytes)
	}

	// Local dev fallback (Docker run)
	return e.runLocalDocker(ctx, subID, language, payloadBytes)
}

func (e *Executor) runK8sJob(ctx context.Context, subID, language string, payloadBytes []byte) (*ExecutionResult, error) {
	jobName := fmt.Sprintf("sub-%s", subID[:8])
	imageName := "skillforge-runner-" + language + ":latest"

	activeDeadlineSec := int64(6)

	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      jobName,
			Namespace: e.Namespace,
			Labels: map[string]string{
				"app":           "skillforge-runner",
				"submission_id": subID,
			},
		},
		Spec: batchv1.JobSpec{
			ActiveDeadlineSeconds: &activeDeadlineSec,
			BackoffLimit:          int32Ptr(0), // Don't retry on user code crash
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{"app": "skillforge-runner"},
				},
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Containers: []corev1.Container{
						{
							Name:            "runner",
							Image:           imageName,
							ImagePullPolicy: corev1.PullIfNotPresent,
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("100m"),
									corev1.ResourceMemory: resource.MustParse("64Mi"),
								},
							},
						},
					},
				},
			},
		},
	}

	log.Printf("Dispatching K8s Job %s for submission %s...", jobName, subID)
	_, err := e.Clientset.BatchV1().Jobs(e.Namespace).Create(ctx, job, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to create K8s job: %w", err)
	}

	defer func() {
		// Clean up completed job
		propagation := metav1.DeletePropagationBackground
		e.Clientset.BatchV1().Jobs(e.Namespace).Delete(context.Background(), jobName, metav1.DeleteOptions{
			PropagationPolicy: &propagation,
		})
	}()

	// Watch job pod logs
	time.Sleep(2 * time.Second)
	pods, err := e.Clientset.CoreV1().Pods(e.Namespace).List(ctx, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("submission_id=%s", subID),
	})

	if err != nil || len(pods.Items) == 0 {
		return nil, fmt.Errorf("job pod not found")
	}

	podName := pods.Items[0].Name
	req := e.Clientset.CoreV1().Pods(e.Namespace).GetLogs(podName, &corev1.PodLogOptions{})
	logs, err := req.DoRaw(ctx)
	if err != nil {
		return &ExecutionResult{
			Status:       "TIME_LIMIT_EXCEEDED",
			ErrorMessage: "Execution timed out (5s limit exceeded)",
		}, nil
	}

	var result ExecutionResult
	if err := json.Unmarshal(logs, &result); err != nil {
		return &ExecutionResult{
			Status:       "RUNTIME_ERROR",
			ErrorMessage: string(logs),
		}, nil
	}

	return &result, nil
}

func (e *Executor) runLocalDocker(ctx context.Context, subID, language string, payloadBytes []byte) (*ExecutionResult, error) {
	var cmd *exec.Cmd

	runnerPath := fmt.Sprintf("runners/%s/runner.py", language)
	if _, err := os.Stat(runnerPath); os.IsNotExist(err) {
		runnerPath = fmt.Sprintf("execution-workers/runners/%s/runner.py", language)
	}

	switch language {
	case "python":
		cmd = exec.CommandContext(ctx, "python3", runnerPath)
	case "javascript":
		jsPath := strings.Replace(runnerPath, "runner.py", "runner.js", 1)
		cmd = exec.CommandContext(ctx, "node", jsPath)
	case "cpp":
		cppPath := strings.Replace(runnerPath, "runner.py", "runner.cpp", 1)
		execPath := "/tmp/runner_cpp_" + subID[:8]
		out, err := exec.CommandContext(ctx, "g++", "-O3", cppPath, "-o", execPath).CombinedOutput()
		if err != nil {
			return &ExecutionResult{
				Status:       "COMPILE_ERROR",
				ErrorMessage: fmt.Sprintf("C++ Compilation Error: %s", string(out)),
			}, nil
		}
		cmd = exec.CommandContext(ctx, execPath)
	case "c":
		cPath := strings.Replace(runnerPath, "runner.py", "runner.c", 1)
		execPath := "/tmp/runner_c_" + subID[:8]
		out, err := exec.CommandContext(ctx, "gcc", "-O3", cPath, "-o", execPath).CombinedOutput()
		if err != nil {
			return &ExecutionResult{
				Status:       "COMPILE_ERROR",
				ErrorMessage: fmt.Sprintf("C Compilation Error: %s", string(out)),
			}, nil
		}
		cmd = exec.CommandContext(ctx, execPath)
	case "java":
		javaPath := strings.Replace(runnerPath, "runner.py", "Runner.java", 1)
		out, err := exec.CommandContext(ctx, "javac", javaPath).CombinedOutput()
		if err != nil {
			return &ExecutionResult{
				Status:       "COMPILE_ERROR",
				ErrorMessage: fmt.Sprintf("Java Compilation Error: %s", string(out)),
			}, nil
		}
		dir := filepath.Dir(javaPath)
		cmd = exec.CommandContext(ctx, "java", "-cp", dir, "Runner")
	case "go":
		goPath := strings.Replace(runnerPath, "runner.py", "runner.go", 1)
		cmd = exec.CommandContext(ctx, "go", "run", goPath)
	case "rust":
		rustPath := strings.Replace(runnerPath, "runner.py", "runner.rs", 1)
		execPath := "/tmp/runner_rust_" + subID[:8]
		out, err := exec.CommandContext(ctx, "rustc", "-O", rustPath, "-o", execPath).CombinedOutput()
		if err != nil {
			return &ExecutionResult{
				Status:       "COMPILE_ERROR",
				ErrorMessage: fmt.Sprintf("Rust Compilation Error: %s", string(out)),
			}, nil
		}
		cmd = exec.CommandContext(ctx, execPath)
	default:
		cmd = exec.CommandContext(ctx, "python3", runnerPath)
	}

	cmd.Stdin = bytes.NewReader(payloadBytes)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil && stdout.Len() == 0 {
		return &ExecutionResult{
			Status:       "RUNTIME_ERROR",
			ErrorMessage: fmt.Sprintf("Local runner execution error: %v (stderr: %s)", err, stderr.String()),
		}, nil
	}

	outStr := strings.TrimSpace(stdout.String())
	var result ExecutionResult
	if err := json.Unmarshal([]byte(outStr), &result); err != nil {
		return &ExecutionResult{
			Status:       "RUNTIME_ERROR",
			ErrorMessage: fmt.Sprintf("Failed to parse runner output: %s", outStr),
		}, nil
	}

	return &result, nil
}

func int32Ptr(i int32) *int32 { return &i }
