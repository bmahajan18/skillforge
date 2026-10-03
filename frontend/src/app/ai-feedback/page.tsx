'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import { analyzeCodeAI, DetailedAnalysis, SupportedLanguage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Editor from '@monaco-editor/react';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

const SAMPLE_CODE: Record<SupportedLanguage, string> = {
  python: `def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
  javascript: `function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) return [map.get(diff), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}`,
  cpp: `#include <vector>\n#include <unordered_map>\n\nstd::vector<int> twoSum(std::vector<int>& nums, int target) {\n    std::unordered_map<int, int> map;\n    for (int i = 0; i < nums.size(); ++i) {\n        int diff = target - nums[i];\n        if (map.count(diff)) return {map[diff], i};\n        map[nums[i]] = i;\n    }\n    return {};\n}`,
  c: `#include <stdio.h>\nint binarySearch(int arr[], int l, int r, int x) {\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (arr[m] == x) return m;\n        if (arr[m] < x) l = m + 1;\n        else r = m - 1;\n    }\n    return -1;\n}`,
  java: `import java.util.*;\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (map.containsKey(diff)) return new int[]{map.get(diff), i};\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
  go: `package main\n\nfunc twoSum(nums []int, target int) []int {\n    m := make(map[int]int)\n    for i, num := range nums {\n        if idx, ok := m[target-num]; ok {\n            return []int{idx, i}\n        }\n        m[num] = i\n    }\n    return nil\n}`,
  rust: `use std::collections::HashMap;\n\nfn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {\n    let mut map = HashMap::new();\n    for (i, num) in nums.iter().enumerate() {\n        if let Some(&idx) = map.get(&(target - num)) {\n            return vec![idx as i32, i as i32];\n        }\n        map.insert(num, i);\n    }\n    vec![]\n}`
};

export default function AIFeedbackPage() {
  const { token, openAuthModal } = useAuth();
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(SAMPLE_CODE.python);
  const [title, setTitle] = useState<string>('Algorithmic Solution');
  const [analysis, setAnalysis] = useState<DetailedAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLangChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setCode(SAMPLE_CODE[lang] || `// Code in ${lang}`);
  };

  const handleAnalyze = async () => {
    if (!token) {
      openAuthModal();
      return;
    }
    if (!code) return;
    setLoading(true);
    setAnalysis(null);

    try {
      const res = await analyzeCodeAI(token, language, code, title);
      setAnalysis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles color="var(--accent-purple)" /> AI Code Critique & Review Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Get instant architectural feedback, time/space complexity analysis, and code smell identification powered by Claude AI.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left: Input Code */}
          <div className="clean-panel" style={{ display: 'flex', flexDirection: 'column', height: '550px' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <select
                value={language}
                onChange={(e) => handleLangChange(e.target.value as any)}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-heading)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="python">Python 3.11</option>
                <option value="javascript">Node.js 20</option>
                <option value="cpp">C++ 20</option>
                <option value="c">C 11</option>
                <option value="java">Java 21</option>
                <option value="go">Go 1.22</option>
                <option value="rust">Rust 1.75</option>
              </select>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                style={{ padding: '6px 14px', background: 'var(--accent-purple)', border: 'none', color: '#ffffff', borderRadius: '4px', fontWeight: 600, fontSize: '0.85rem', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Analyzing...' : 'Analyze Code'}
              </button>
            </div>

            <div style={{ flex: 1 }}>
              <Editor
                height="100%"
                language={language === 'python' ? 'python' : language === 'javascript' ? 'javascript' : language}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                options={{ fontSize: 13, fontFamily: 'var(--font-mono)', minimap: { enabled: false } }}
              />
            </div>
          </div>

          {/* Right: Detailed Analysis Output */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '550px', overflowY: 'auto' }}>
            {analysis ? (
              <>
                {/* Score Header */}
                <div className="clean-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Code Quality Score</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 700, color: analysis.quality_score >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                      {analysis.quality_score} / 100
                    </h2>
                  </div>
                  <ShieldCheck size={36} color={analysis.quality_score >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)'} />
                </div>

                {/* Complexity Specs */}
                <div className="clean-card" style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time Complexity</span>
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>{analysis.time_complexity}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Space Complexity</span>
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-indigo)', marginTop: '0.2rem' }}>{analysis.space_complexity}</p>
                  </div>
                </div>

                {/* Code Smells */}
                {analysis.code_smells?.length > 0 && (
                  <div className="clean-card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-amber)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={15} /> Potential Code Smells
                    </h4>
                    <ul style={{ paddingLeft: '1.2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {analysis.code_smells.map((smell, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{smell}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                <div className="clean-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-green)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} /> Actionable Refactoring Suggestions
                  </h4>
                  <ul style={{ paddingLeft: '1.2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {analysis.suggestions?.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="clean-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Sparkles size={36} color="var(--accent-purple)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>Ready for Code Analysis</h3>
                <p style={{ fontSize: '0.875rem', maxWidth: '340px' }}>
                  Paste any code snippet on the left and click "Analyze Code" to generate time complexity metrics and refactoring tips.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
